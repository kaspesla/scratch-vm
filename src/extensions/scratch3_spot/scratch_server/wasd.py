# Copyright (c) 2021 Boston Dynamics, Inc.  All rights reserved.
#
# Downloading, reproducing, distributing or otherwise using the SDK Software
# is subject to the terms and conditions of the Boston Dynamics Software
# Development Kit License (20191101-BDSDK-SL).

"""WASD driving of robot."""

from __future__ import print_function
from collections import OrderedDict
import curses
import logging
import signal
import sys
import threading
import time
import math
import io
import os

from PIL import Image, ImageEnhance

from bosdyn.api import geometry_pb2
import bosdyn.api.power_pb2 as PowerServiceProto
# import bosdyn.api.robot_command_pb2 as robot_command_pb2
import bosdyn.api.robot_state_pb2 as robot_state_proto
import bosdyn.api.basic_command_pb2 as basic_command_pb2
import bosdyn.api.spot.robot_command_pb2 as spot_command_pb2
from bosdyn.client import create_standard_sdk, ResponseError, RpcError
from bosdyn.client.async_tasks import AsyncGRPCTask, AsyncPeriodicQuery, AsyncTasks
from bosdyn.client.estop import EstopClient, EstopEndpoint, EstopKeepAlive
from bosdyn.client.lease import LeaseClient, LeaseKeepAlive
from bosdyn.client.lease import Error as LeaseBaseError
from bosdyn.client.power import PowerClient
from bosdyn.client.robot_command import RobotCommandClient, RobotCommandBuilder
from bosdyn.client.image import ImageClient
from bosdyn.client.robot_state import RobotStateClient
from bosdyn.client.time_sync import TimeSyncError
import bosdyn.client.util
from bosdyn.client.frame_helpers import ODOM_FRAME_NAME
from bosdyn.util import duration_str, format_metric, secs_to_hms

from twisted.web import server, resource
from twisted.internet import reactor, endpoints
from twisted.internet import task

LOGGER = logging.getLogger()

VELOCITY_BASE_SPEED = 0.5  # m/s
VELOCITY_BASE_ANGULAR = 0.8  # rad/sec
VELOCITY_CMD_DURATION = 0.6  # seconds
COMMAND_INPUT_RATE = 0.1


class Counter(resource.Resource):
    isLeaf = True
    numberRequests = 0
    def __init__(self, inter):
        self.inter = inter

    def render_GET(self, request):
        self.numberRequests += 1
        request.setHeader('Access-Control-Allow-Origin', '*')
        request.setHeader('Access-Control-Allow-Methods', 'GET')
        request.setHeader('Access-Control-Allow-Headers','x-prototype-version,x-requested-with')
        request.setHeader('Access-Control-Max-Age', "2520")
        request.setHeader('Content-type', 'application/json')

        request.setHeader(b"content-type", b"text/plain")
        print(request)
        try:
             cmd = request.uri[1] 
        except Exception as e:
              content = "failed"
              return content.encode("ascii")
        try:
             self.inter._drive_cmd(cmd)
             time.sleep(COMMAND_INPUT_RATE)
        except Exception as e:
             print(e)
             self.inter._safe_power_off()
             time.sleep(2.0)
             content = "failed"
             return content.encode("ascii")

        content = "ok"
        return content.encode("ascii")

def _grpc_or_log(desc, thunk):
    try:
        return thunk()
    except (ResponseError, RpcError) as err:
        LOGGER.error("Failed %s: %s" % (desc, err))


class ExitCheck(object):
    """A class to help exiting a loop, also capturing SIGTERM to exit the loop."""

    def __init__(self):
        self._kill_now = False
        signal.signal(signal.SIGTERM, self._sigterm_handler)
        signal.signal(signal.SIGINT, self._sigterm_handler)

    def __enter__(self):
        return self

    def __exit__(self, _type, _value, _traceback):
        return False

    def _sigterm_handler(self, _signum, _frame):
        self._kill_now = True
        reactor.stop()

    def request_exit(self):
        """Manually trigger an exit (rather than sigterm/sigint)."""
        self._kill_now = True

    @property
    def kill_now(self):
        """Return the status of the exit checker indicating if it should exit."""
        return self._kill_now


class AsyncRobotState(AsyncPeriodicQuery):
    """Grab robot state."""

    def __init__(self, robot_state_client):
        super(AsyncRobotState, self).__init__("robot_state", robot_state_client, LOGGER,
                                              period_sec=0.2)

    def _start_query(self):
        return self._client.get_robot_state_async()


class AsyncImageCapture(AsyncGRPCTask):
    """Grab camera images from the robot."""

    def __init__(self, robot):
        super(AsyncImageCapture, self).__init__()
        self._image_client = robot.ensure_client(ImageClient.default_service_name)
        self._ascii_image = None
        self._video_mode = False
        self._should_take_image = False

    @property
    def ascii_image(self):
        """Return the latest captured image as ascii."""
        return self._ascii_image

    def toggle_video_mode(self):
        """Toggle whether doing continuous image capture."""
        self._video_mode = not self._video_mode

    def take_image(self):
        """Request a one-shot image."""
        self._should_take_image = True

    def _start_query(self):
        self._should_take_image = False
        source_name = "frontright_fisheye_image"
        return self._image_client.get_image_from_sources_async([source_name])

    def _should_query(self, now_sec):  # pylint: disable=unused-argument
        return self._video_mode or self._should_take_image

    def _handle_result(self, result):
        import io
        image = Image.open(io.BytesIO(result[0].shot.image.data))

    def _handle_error(self, exception):
        LOGGER.exception("Failure getting image: %s" % exception)


class WasdInterface(object):
    """A curses interface for driving the robot."""

    def __init__(self, robot):
        self._robot = robot
        # Create clients -- do not use the for communication yet.
        if robot:
            self._lease_client = robot.ensure_client(LeaseClient.default_service_name)
            try:
                self._estop_client = self._robot.ensure_client(EstopClient.default_service_name)
                self._estop_endpoint = EstopEndpoint(self._estop_client, 'GNClient', 9.0)
            except:
                # Not the estop.
                self._estop_client = None
                self._estop_endpoint = None
            self._power_client = robot.ensure_client(PowerClient.default_service_name)
            self._robot_state_client = robot.ensure_client(RobotStateClient.default_service_name)
            self._robot_command_client = robot.ensure_client(RobotCommandClient.default_service_name)
            self._robot_state_task = AsyncRobotState(self._robot_state_client)
            self._image_task = AsyncImageCapture(robot)
            self._async_tasks = AsyncTasks(
                [self._robot_state_task, self._image_task])
        self._lock = threading.Lock()
        self._command_dictionary = {
            ord('\t'): self._quit_program,
            ord('T'): self._toggle_time_sync,
            ord(' '): self._toggle_estop,
            ord('E'): self._toggle_estop,
            ord('r'): self._self_right,
            ord('P'): self._toggle_power,
            ord('v'): self._sit,
            ord('b'): self._battery_change_pose,
            ord('f'): self._stand,
            ord('w'): self._move_forward,
            ord('s'): self._move_backward,
            ord('a'): self._strafe_left,
            ord('d'): self._strafe_right,
            ord('q'): self._turn_left,
            ord('e'): self._turn_right,
            #ord('I'): self._image_task.take_image,
            #ord('O'): self._image_task.toggle_video_mode,
            ord('u'): self._unstow,
            ord('j'): self._stow,
            ord('l'): self._toggle_lease,
            ord('z'): self._test

        }
        self._locked_messages = ['', '', '']  # string: displayed message for user
        self._estop_keepalive = None
        self._exit_check = None

        # Stuff that is set in start()
        self._robot_id = None
        self._lease = None
        self._lease_keepalive = None

    def start(self):
        """Begin communication with the robot."""
        self._lease = self._lease_client.acquire()
        # Construct our lease keep-alive object, which begins RetainLease calls in a thread.
        self._lease_keepalive = LeaseKeepAlive(self._lease_client)

        self._robot_id = self._robot.get_id()
        if self._estop_endpoint is not None:
            self._estop_endpoint.force_simple_setup(
            )  # Set this endpoint as the robot's sole estop.

    def shutdown(self):
        """Release control of robot as gracefully as posssible."""
        LOGGER.info("Shutting down WasdInterface.")
        if self._estop_keepalive:
            # This stops the check-in thread but does not stop the robot.
            self._estop_keepalive.shutdown()
        if self._lease:
            _grpc_or_log("returning lease", lambda: self._lease_client.return_lease(self._lease))
            self._lease = None

    def flush_and_estop_buffer(self, stdscr):
        """Manually flush the curses input buffer but trigger any estop requests (space)"""
        key = ''
        while key != -1:
            key = stdscr.getch()
            if key == ord(' '):
                self._toggle_estop()

    def add_message(self, msg_text):
        """Display the given message string to the user in the curses interface."""
        with self._lock:
            self._locked_messages = [msg_text] + self._locked_messages[:-1]

    def message(self, idx):
        """Grab one of the 3 last messages added."""
        with self._lock:
            return self._locked_messages[idx]

    @property
    def robot_state(self):
        """Get latest robot state proto."""
        return self._robot_state_task.proto

    def drive(self):
        """User interface to control the robot via the passed-in curses screen interface object."""
        with ExitCheck() as self._exit_check:

            try:
                    endpoints.serverFromString(reactor, "tcp:8080").listen(server.Site(Counter(self)))
                    l = task.LoopingCall(self._async_tasks.update)
                    l.start(0.1) # call every second

                    reactor.run()
            finally:
                    pass

    def _drive_cmd(self, key):
        """Run user commands at each update."""
        try:
            print("received: " + chr(key))
            cmd_function = self._command_dictionary[key]
            cmd_function()

        except KeyError:
            if key and key != -1 and key < 256:
                self.add_message("Unrecognized keyboard command: '{}'".format(chr(key)))

    def _try_grpc(self, desc, thunk):
        try:
            return thunk()
        except (ResponseError, RpcError, LeaseBaseError) as err:
            self.add_message("Failed {}: {}".format(desc, err))
            return None

    def _try_grpc_async(self, desc, thunk):
        def on_future_done(fut):
            try:
                fut.result()
            except (ResponseError, RpcError, LeaseBaseError) as err:
                self.add_message("Failed {}: {}".format(desc, err))
                return None
        future = thunk()
        future.add_done_callback(on_future_done)

    def _quit_program(self):
        self._sit()
        if self._exit_check is not None:
            self._exit_check.request_exit()

    def _toggle_time_sync(self):
        if self._robot.time_sync.stopped:
            self._robot.start_time_sync()
        else:
            self._robot.time_sync.stop()

    def _toggle_estop(self):
        """toggle estop on/off. Initial state is ON"""
        if self._estop_client is not None and self._estop_endpoint is not None:
            if not self._estop_keepalive:
                self._estop_keepalive = EstopKeepAlive(self._estop_endpoint)
            else:
                self._try_grpc("stopping estop", self._estop_keepalive.stop)
                self._estop_keepalive.shutdown()
                self._estop_keepalive = None

    def _test(self):
        print("test!")

    def _toggle_lease(self):
        """toggle lease acquisition. Initial state is acquired"""
        if self._lease_client is not None:
            if self._lease_keepalive is None:
                self._lease = self._lease_client.acquire()
                self._lease_keepalive = LeaseKeepAlive(self._lease_client)
            else:
                self._lease_client.return_lease(self._lease)
                self._lease_keepalive.shutdown()
                self._lease_keepalive = None

    def _start_robot_command(self, desc, command_proto, end_time_secs=None):

        def _start_command():
            if self._robot:
                self._robot_command_client.robot_command(lease=None, command=command_proto,
                                                     end_time_secs=end_time_secs)
            else:
                print("no robot")

        self._try_grpc(desc, _start_command)

    def _self_right(self):
        self._start_robot_command('self_right', RobotCommandBuilder.selfright_command())

    def _battery_change_pose(self):
        # Default HINT_RIGHT, maybe add option to choose direction?
        self._start_robot_command(
            'battery_change_pose',
            RobotCommandBuilder.battery_change_pose_command(dir_hint=
            basic_command_pb2.BatteryChangePoseCommand.Request.HINT_RIGHT))

    def _sit(self):
        self._start_robot_command('sit', RobotCommandBuilder.synchro_sit_command())

    def _stand(self):
        self._start_robot_command('stand', RobotCommandBuilder.synchro_stand_command())

    def _move_forward(self):
        self._velocity_cmd_helper('move_forward', v_x=VELOCITY_BASE_SPEED)

    def _move_backward(self):
        self._velocity_cmd_helper('move_backward', v_x=-VELOCITY_BASE_SPEED)

    def _strafe_left(self):
        self._velocity_cmd_helper('strafe_left', v_y=VELOCITY_BASE_SPEED)

    def _strafe_right(self):
        self._velocity_cmd_helper('strafe_right', v_y=-VELOCITY_BASE_SPEED)

    def _turn_left(self):
        self._velocity_cmd_helper('turn_left', v_rot=VELOCITY_BASE_ANGULAR)

    def _turn_right(self):
        self._velocity_cmd_helper('turn_right', v_rot=-VELOCITY_BASE_ANGULAR)

    def _velocity_cmd_helper(self, desc='', v_x=0.0, v_y=0.0, v_rot=0.0):
        self._start_robot_command(desc,
                                  RobotCommandBuilder.synchro_velocity_command(
                                      v_x=v_x, v_y=v_y, v_rot=v_rot),
                                  end_time_secs=time.time() + VELOCITY_CMD_DURATION)

    def _stow(self):
        self._start_robot_command('stow', RobotCommandBuilder.arm_stow_command())

    def _unstow(self):
        self._start_robot_command('stow', RobotCommandBuilder.arm_ready_command())

    def _return_to_origin(self):
        self._start_robot_command('fwd_and_rotate',
                                  RobotCommandBuilder.synchro_se2_trajectory_point_command(
                                      goal_x=0.0, goal_y=0.0, goal_heading=0.0,
                                      frame_name=ODOM_FRAME_NAME, params=None, body_height=0.0,
                                      locomotion_hint=spot_command_pb2.HINT_SPEED_SELECT_TROT),
                                  end_time_secs=time.time() + 20)

    def _take_ascii_image(self):
        source_name = "frontright_fisheye_image"
        image_response = self._image_client.get_image_from_sources([source_name])
        image = Image.open(io.BytesIO(image_response[0].shot.image.data))
        ascii_image = self._ascii_converter.convert_to_ascii(image, new_width=70)
        self._last_image_ascii = ascii_image

    def _toggle_ascii_video(self):
        if self._video_mode:
            self._video_mode = False
        else:
            self._video_mode = True


    def _toggle_power(self):
        print("toggle power")
        power_state = self._power_state()
        if power_state is None:
            self.add_message('Could not toggle power because power state is unknown')
            return

        if power_state == robot_state_proto.PowerState.STATE_OFF:
            self._try_grpc_async("powering-on", self._request_power_on)
        else:
            self._try_grpc("powering-off", self._safe_power_off)

    def _request_power_on(self):
        request = PowerServiceProto.PowerCommandRequest.REQUEST_ON
        return self._power_client.power_command_async(request)

    def _safe_power_off(self):
        if self._robot:
            self._start_robot_command('safe_power_off', RobotCommandBuilder.safe_power_off_command())

    def _power_state(self):
        state = self.robot_state
        if not state:
            return None
        return state.power_state.motor_power_state

    def _lease_str(self, lease_keep_alive):
        alive = '??'
        lease = '??'
        if lease_keep_alive is None:
            alive = 'STOPPED'
            lease = 'RETURNED'
        else:
            if self._lease:
                lease = '{}:{}'.format(self._lease.lease_proto.resource,
                                       self._lease.lease_proto.sequence)
            else:
                lease = '...'
            if lease_keep_alive.is_alive():
                alive = 'RUNNING'
            else:
                alive = 'STOPPED'
        return 'Lease {} THREAD:{}'.format(lease, alive)

    def _power_state_str(self):
        power_state = self._power_state()
        if power_state is None:
            return ''
        state_str = robot_state_proto.PowerState.MotorPowerState.Name(power_state)
        return 'Power: {}'.format(state_str[6:])  # get rid of STATE_ prefix

    def _estop_str(self):
        if not self._estop_client:
            thread_status = 'NOT ESTOP'
        else:
            thread_status = 'RUNNING' if self._estop_keepalive else 'STOPPED'
        estop_status = '??'
        state = self.robot_state
        if state:
            for estop_state in state.estop_states:
                if estop_state.type == estop_state.TYPE_SOFTWARE:
                    estop_status = estop_state.State.Name(estop_state.state)[6:]  # s/STATE_//
                    break
        return 'Estop {} (thread: {})'.format(estop_status, thread_status)

    def _time_sync_str(self):
        if not self._robot.time_sync:
            return 'Time sync: (none)'
        if self._robot.time_sync.stopped:
            status = 'STOPPED'
            exception = self._robot.time_sync.thread_exception
            if exception:
                status = '{} Exception: {}'.format(status, exception)
        else:
            status = 'RUNNING'
        try:
            skew = self._robot.time_sync.get_robot_clock_skew()
            if skew:
                skew_str = 'offset={}'.format(duration_str(skew))
            else:
                skew_str = "(Skew undetermined)"
        except (TimeSyncError, RpcError) as err:
            skew_str = '({})'.format(err)
        return 'Time sync: {} {}'.format(status, skew_str)

    def _battery_str(self):
        if not self.robot_state:
            return ''
        battery_state = self.robot_state.battery_states[0]
        status = battery_state.Status.Name(battery_state.status)
        status = status[7:]  # get rid of STATUS_ prefix
        if battery_state.charge_percentage.value:
            bar_len = int(battery_state.charge_percentage.value) // 10
            bat_bar = '|{}{}|'.format('=' * bar_len, ' ' * (10 - bar_len))
        else:
            bat_bar = ''
        time_left = ''
        if battery_state.estimated_runtime:
            time_left = ' ({})'.format(secs_to_hms(battery_state.estimated_runtime.seconds))
        return 'Battery: {}{}{}'.format(status, bat_bar, time_left)


def _setup_logging(verbose):
    """Log to file at debug level, and log to console at INFO or DEBUG (if verbose).

    Returns the stream/console logger so that it can be removed when in curses mode.
    """
    LOGGER.setLevel(logging.DEBUG)
    log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    # Save log messages to file wasd.log for later debugging.
    file_handler = logging.FileHandler('wasd.log')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(log_formatter)
    LOGGER.addHandler(file_handler)

    # The stream handler is useful before and after the application is in curses-mode.
    if verbose:
        stream_level = logging.DEBUG
    else:
        stream_level = logging.INFO

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(stream_level)
    stream_handler.setFormatter(log_formatter)
    LOGGER.addHandler(stream_handler)
    return stream_handler


def startRobot(sdk, options):
    robot = sdk.create_robot(options.hostname)
    try:
        robot.authenticate(options.username, options.password)
        robot.start_time_sync(options.time_sync_interval_sec)
    except RpcError as err:
        LOGGER.error("Failed to communicate with robot: %s" % err)
        return False

    return robot

def main():
    """Command-line interface."""
    import argparse

    parser = argparse.ArgumentParser()
    bosdyn.client.util.add_common_arguments(parser)
    parser.add_argument('--time-sync-interval-sec',
                        help='The interval (seconds) that time-sync estimate should be updated.',
                        type=float)
    options = parser.parse_args()

    stream_handler = _setup_logging(options.verbose)

    # Create robot object.
    sdk = create_standard_sdk('WASDClient')

    robot = startRobot(sdk, options)
    #robot = None

    wasd_interface = WasdInterface(robot)
    if robot:
        try:
            wasd_interface.start()
        except (ResponseError, RpcError) as err:
            LOGGER.error("Failed to initialize robot communication: %s" % err)
            return False

    LOGGER.removeHandler(stream_handler)  # Don't use stream handler in curses mode.
    try:
        # Run wasd interface in curses mode, then restore terminal config.
        wasd_interface.drive()
    except Exception as e:
        LOGGER.error("WASD has thrown an error: %s" % repr(e))
    finally:
        # Restore stream handler after curses mode.
        LOGGER.addHandler(stream_handler)
        # Do any final cleanup steps.
        wasd_interface.shutdown()

    return True


if __name__ == "__main__":
    if not main():
        os._exit(1)
    os._exit(0)
