const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const fetchWithTimeout = require('../../util/fetch-with-timeout');
const log = require('../../util/log');

const serverTimeoutMs = 10000; // 10 seconds (chosen arbitrarily).


/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAuCAYAAADeIbxeAAAABGdBTUEAALGPC_xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAZKADAAQAAAABAAAALgAAAADOwvOqAAAACXBIWXMAAAsTAAALEwEAmpwYAAACZ2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjIwMDwvZXhpZjpQaXhlbFhEaW1lbnNpb24-CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj45MjwvZXhpZjpQaXhlbFlEaW1lbnNpb24-CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY-CjwveDp4bXBtZXRhPgr_9rdIAAAShUlEQVR4Ae1cCXxTVbr_7pK9bZqk6Rq6AKW0BRSLVMWl_Q0qIoz6tNXBXWYYHZVB9Mm4TdMBXJFnRRipD3XGeaMUec5jHqICEmREfk9QirRApW3aQrc0TZqkyU1y7z3vO2njFCwI1YFWOe3tuffcs37_823nnFsGTjMQQhgM5GTFonlofLJ8_e9onmh9g-U_Pi36HIntdjuXqVKxTGqqn9ZXXd2um5RYkw9saCbIUjEAUwDBHhUQhoiyRiHJpM4nw5vbvTlv_ltBbmdX1yFtQkJOqL8PtB_Ri1YX7dfx9_QZKB2iY40knODPqeSJFo0OLvo8omJCqjiGKZVopwOt_0hXs11zgISuD7ucBSIhvNflBL8ggJJXgCEuDjQaHkBlBFCrwXWk4dCOPS2_uO6-FV8SK7CMFeThMPgRCQipQiBK-4AQWj7KVmnkhaKrrbSro8O4-2Ab_N9XHdDiZBtkXVw1qHRHUuN0IXUooB9rds-YcUmKxZSQEQQuTnXkQIvn2Q0HLln52ms1xGpFUKxnHZQRBwgh23iGKRZRmnDEufXxsKvl4brDdn3Vxv2wsy7sSErP3jhl8sR377h59g6TyeQ5ZtZbdhqX_Gpt5b0XJNxo0k8UwOVRb_18j236kori0xErx9T5U34gxIoyByDYujmXtPx1V8tny8nvfjmDZF04s2XB44ufqK7eZTmOPiw-80V4WYsgUpa-X__oQ_-QK1cT8ta6cO0TyBX33XURTbcil9D4bIaz3oFTGTydvQgGyzBWkRx95xbwt3-2cdPOwlHTXod6Ib1yw-u_n_LS008tPe-8i45gfVwVijSMKfdTESTa8LLaQFw9b7UCn-EriV3mbEMbgDfIaYoU5vHO3kKaDjbbiKBHpK9n608fGBHiAmnd8IT7y1Vk0T3TSeLEn3UtX_7CLdF-FVmtPM0bfR4sjr5f8OeVuXV3lwfIY--I4dtWkOduvbuC5rciRIOVO5Npw3pG9BGQQfMSCHFUvdje0rTk5l-9BoeC6fv_vmrhJQsX_vs7SCyeihqb1Sp-lzkeJayUkOyVA0wIBJ6VggREFmLou7xjzdxo9jMaD1tACEGuKC9HGiMY7e-9VH-wfqHlojIYM236B-_9Zc2lhZddWzdv3jwqgkQE5JSso3Ksj1J3ckiKU8fEKCEhTg5qOTjS1dpO02v7xBy9PReOpwD1MWgacaz9Q-POF9FBG0semD__rWi-fj0RfTylOFpm-_I1V7lvfJaQe94MN_7scQJXX_RLWoG1qOicyBqMkmQbNW1LJdK-aa7T3v7UDXNXwr0PzHj7lZdfvj1COBRRpf1-yGDlT5RmXlUb4RB1u-difVwSepNhONzdJMLYjC8iZYqKTonTTlT_jzId9UZEjJKWLZN8B1f77r_zGvLrBxbsxPQIx1B9McSBR8B4iBCN_f6KWrJ4CyHz_0pWFV6_F9C36a_zpEbBENs9rWJDHdxpNXI6mVFpyKg1kDDOVz_c_Lmuh83penjerbdhukRFzqnqi-Pb3Ga1RgC9o3LtrSmdci443EFHQwN8bAysB3Q0-8XVwLWr46v46T1_oze63r-vdddzpPTWX5MP_3fTPEoJBCI6i0-bMFFz9z1C4usfrLCTWyoJmfEiWVtY4oTnHow4k9E8p135j7VAlCAHDzpipfo1da89PZcsW_7q1v7xfi9O3g0Rawx2P_JCBVm4lpCnNwdai58kN5Zct4TWb4Wzr8yjuH6vgUYr-SFim608IlJyzLtu7ujozt59RE-uuKxwMa0bRdWQZfvugnmKKVAZfnfRktmZe3vmg18Soa5ZvZ79unH9nOuX0frLyLbIijG9Pxf6KRDxO_CeNP_nJ5vWPESefOaV_-l_FQFqKISiYNByS5cuvaDx5qVOcu9fCLn2pfCWybeT5AXzrqXvSkpKhlw_Lf9Dh2HBIX3rVKjK2_4-tdfVe8nuQwGYmJuxmg4WuWNIY6ZiasqeyvBTixZNvGl3cGumJccIiYZgvaOFf35MzzPtL1VutKKXv27dunPccTyFqd9B04h97VPOz5eRex98eB_qFM3x-U7lmZrFaCpFJtrrL7w8_eubrE5ywypC7vhTwDG9nNwzY2YEYcxDxeCQReGp9GUoeYYFh0BRcd8sVcmF7m4_cErTJ2jmBnBApyVOthVZeWoWI5Xl9x4tf7h4a_vmsWPOM0J2kuD4olptZXZufn3TxjmUULgZRcEYdmbuWQeE6g66XmW1vqGGUGB0jy8AAaXiMCUaEveUZjD1T-iML7ZZxf_Ytinz098-s_GqZv2ydGMGgU5vqHVfjXpxcu2GlR99MAtbE7FiFq9h6ZWfdUCik_TOmbp4EIlZRDLFmYwOCkheXt5JZ3AVKmTMwNFlFESObFhc8eDMlbu-vLgpZqZ2XLbAchxTvfMT5f3SjooVWz64DsEIDWcw6JiH7GzRwj9I6FuBJSmK7lgU_TqdWgl80HdCRUv9FVTEbElpKb2J5Fta_vviq2oDi3P3S9N0qfkA3T5B3H1A_YFwwLOoSFxQu3rzG5G-DmPOiNLy7HNIWVmECxzdfj_Iyt5RKRpgW-uzaAe3bNkS7R9TVRIRS3jKhCH9HCG_ZF1y-ZYbH3jvzhrVx1M0udN0WpMAQgDsLYfUryi_-Hj2DOOU2tV_egO1OIfaghmuYioKBo3pwSIc48nPWQ0s8EPfR3XIzp3LNVPMxmoF58tev6lu302OiguRhqLNWsQWgw0PNfSHfTsMf96wc9bomq6708PxxaMUCQCxsSFQssqevTXwMdvYtnFq8tNrli17hZYowiV1m21A-Wg9wzQeBoDgQiKKIHqsp7fmjx9pDforW-sOQsX7_ieff37Z0gjdvn4_7tV3qy_Jag7-PMUhzk5XJlj0DG7y6TQhYCVlb20DfCI0df4twbmq8rbLV8KcR7qQ7ZhyNAqsw1R5n2g-MDVVVcrOVbUyFOFsqskj6wbkLMmvJeUDnodyW4aF1tXU9FtLJWB24J6EzYbN2SLm6cA6e2qX3xKnM70NgSD58qua8Or17OLbOG2WUSLTTYI6PSkG9zA4JWo-XiIhgXMeaYa9vKNtu6p99ZIxh1-Fiv0dtL6RxhUDadBPqIFJZ_AeT5LABo1uRbs2jWvssCgPdVw2Y17KE2k5Y1kI-eBATR0TfE6E85PPB0jUyeDvYUW0Wmua68WWHFVtTZLi7d8ludfA_BURq8yK4sm6DdelzqII_r7UYw4sWV3hqm1qCJg1_iADrpAUDvKGWDmUGh_yaTlPg7cneJR4w00KXmJ5LclLTiYJKiVICgXxsyyDplEkcGGRkRiWcbtcjKfbxbGczI8jCpVRUum89hadeLiFNcgKnRoUyYZ4gyU2zFpUQSaNDzOWGE5liuF5jUHUs62xHXLcXCWrT8qUQe6WjjZ3MM0fdLLsbg3rS9Xs3NvR-NYjF_A74Nk3v46Ysdg6dQiLt5WNaCD6yYhK_foVBPQoj9E7w8PJfReaJDInQ0AMgxAOgcRKJAwykVncPFJxMsZRF5dILCH4Bs0YBrAISOhIkLDMKLBCFcsxPIdBZFilzIESxQ3Pq9C6RQc8cmGbtF0sCzLqbZ6B3hYnfJq5Tyy8K4vXGzPwHSuFe9vZr1u7mFa_ZoOjV_tKIDRr19y5473RQVDDwGazckXbQUalQa02eo3IwNTMe6FQQViLllWZWE6RzsqyXqdUJrCCFEtkWYdjNcsBUcMCUciSHIe4aBiJAIuB5zmWJyzLsdQ6RaIiUN8QmNKZ0gXBQoggjCtMIYROIlIIQZZCWIksie6wHHb34llEl-Bvc_g9DT1x_oZPPMk1l158eOqMyydVZGSno9IwiiAh_7IeLuj1QVNbb1e3GLO1w8m9v1-esO3Je65uGUh9UlXC2Wrzme0IcxkChF0ZMQBFyDZwMN-6X12ggL_tYWGWVXGXvTcmp7s3JujzsQZlvDJJVmjiw1yMVpC1shBkZYUCiUaQjViGemxcMIjcQkgwFCCOkI_4DApRMKncBwWX90iKUfhwlNIJjX_0QSWEv9UuTciDybaFd60qmDjuopgEVOi8JgxhGecIQZnZA0JvEFodvW5BIJ8d9YS3HuxO3DF_ftZ-gNmRTxOideK6DGuDK1hHnoPU1tbio3XYchFDOws1eQzkU-unfwg2nNS4bYNH1M7IzMJGcGKUsLaifMZhriG16_LJFduALS62Uv-D-e2cy2-fXZR8_7j09KmjMjMAlDpMVgeB4RgIeZSgQBEY8EBrh1Pu9cv1bi_5vM3NffaVM7j7yQP_XQv_dfjYQ9dYmgBhbVYbsvZ2_EFOQgf1bPpj_ZSnhDh56CNWNA8-4W_0wFlZf_I_zdpovhPHtfn5WAPCTT101B_9HYikHV8KZzJbVoYip09l0azT31gyY8749MSZuVnjEvVJcZiEEk2dEIKQH-tglcDhslYgAMSlhw57SHb7pCN-WbuvMyDs7RRc1Z_Gdu6vnPCMHYpBOL49-kysCBT0AVUEZTKU4ac-ET13ZsTedwIyWKfPdFoV6oSSkip5wAxOuuWyzGtmzci9YXS6-YrcLIs-3hAPoEGvXeJECBgkCCaxpEPmGVnPQBiNFjSMPVIAnEGPEJICTSFF6ICb8R7oYnpqmln34QXa6gaIeaMbSmHQdTTkKGZdyTrWnG9moqKvn6siOP5QNBkRgEQHS7dbq0pQhpUes8uXMbNg3JWzrs66ZlyG6dIxqcbEUfH5wAmZAD1olKtSRfDFStCO-i1ZxYFH5MCHX7CZcV01hLh5XOBm3ZJXDLgDcm-jjxUanOBt8LKBOpcuZG80yPZl8GA7AkX3ZwYNBFBHWQHF3xXwDVjWoYn8EQXIAGow6ARyZduKkGuO2dcwAxRMe_R2c_GExIzLxsSOzrXE56oTpQxQi_jKjCLOHUYOIBKMimWgUwDJF2a5dDUHeOgaHCjF4pCuKgn8bje4hW7i5r3-IBdu9UPI7uEDdkEO1HVppEZnvGx_THO0CY0dF8rdQbmK9rdPBJZTMxTByosYFWUnAWukAkLHFwlIRqZ8cHB4PNOeDZPGFy5IKbw4VzN6qkWbmjNak6FJjU-FGFM8sD7UPxxuqWRoJOQcIjpEhh-tA6JCz6bOxzJKngULcpYXjcCuIIpEEUJaEXr8PeDyu8ReCLhFhdzcywtNLsljR7uvLqCQm7z6oH1R-KEj0AK9YKUG0uAhCtZ2fJ2Hy1Yl-SXURP9RBQbFGluCYq30WLFGB8nD-ZAFWij4uebKKRdoxk_OjMmYkGlINWckZjGJsgE0jAaYNLTg8Gs5aEcuMiqAZClYuT0EpCVM-AwlgRR0bJsEFtrxSsBDLfHUwhNA7gmAH3eduzkP6ipvMCAIXUFOaOoBb1O36Ld7QagXjdxRlz7cbFXWHYXSSurYfgusHxsgx8wuaqXRr6LyzL8hpev6PhI9JgOACXIhH0E6__b4GyeP12RMtBhTx43Vjoq1aNLAoDdBTLwemF4sFUCQ0nUSmFH6NAZZySkyJEcFbIqSsM0hAs1hAkY0w9M4FsUfA62ocqgYjCMgoQj0Bn3g7nVDT9gTChOhy8eHWzzgb3JI3XavHKwPa_nm5PzRrh81IMcRH50qAqUlpWy-w8GU4SLkAKstmhWnO6TCVHRJ4xIn_QIuPW-8Kj0_PT55zGi1JdZiSMfPqw0QG1IDT7SARgKCgNTuRBXSiYtIozhGzlYB48GWDgi4m4POTraaICcR6AgwYA-yuDzFQAKCqkejwh-EsDcAPtGPEtMDgiok_pQAiRJ9YEz3S3AdzMb-xmYmpXCM9RbNp4CZCJIHeUmG_FkxV0-apMrKS1MmZ6fFpuiz49KR3gaI4WJAHRcLrAktuyAuVDhF9LNwLWm8kiEJPCO1hBloQF2kYQmbowYmUUGYVmShwwJ-woWcZMTlQCN-hRFt9VwcoUCEHlQPOZCLTgISB9MgCY7AeIiD3ELTxRMn8Bk5Y1Vp4ywxyYnpsWm8RZsCeqURRV4sqLRqFHnIoH5ewsVZgCwlC0ZcqaW6yR7GF9jsGNy6zqJLtOfCd1GA7qqikVAaAclsNpMTnnbMhHhIhLHQjkClxk64RnVhbr4qKydNnZw-KiZZMyZmFBhjE3BxXQ9arRYUATQQ0EwDhpchEVdoLUq6PHsuDJEClHbRi1ZxIl9EBRMhDeohB2283IyE7AmFJHtcliojG7nJlK5L4CxaC5h0RojTGc4Mh_yrDlJE66Xx9yAqCvAIHaLxYFXR-gd7_027e_bsYQoKCmhZBv8hDtvW1sakpKSQzMxM-nXwPw9pYIZq0q577M0_xL6_ZlUGiry8K02zChJ5wwUmWTPl_wGMnzAg7vM0hgAAAABJRU5ErkJggg';

/**
 * Class for the makey makey blocks in Scratch 3.0
 * @constructor
 */
class Scratch3HueBlocks
{
    constructor(runtime)
    {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.getItemsForLightsMenu = function()
        {
            return this.menuNames;
        }

        this.noWait = 0.25;

        this.lightserver = this.readCookie("lightserver");

        this.lights = {};
        this.groups = {};
        this.menuNames = ["Lamp 1"];
        this.gotLights = false;

        this.configCallback = 0;

        if (this.lightserver)
        {
            this.pingLights();
        }
        else
        {
            errMessage = "No server.";
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo()
    {

        if (this.lightserver)
        {
            return {
                id: 'hue',
                name: 'Hue Lights',
                blockIconURI: blockIconURI,
                blocks: [
                {
                    opcode: 'lightOn',
                    text: formatMessage(
                    {
                        id: 'lightOn',
                        default: '[LIGHT] on',
                        description: 'ON'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                         //   defaultValue: "Light 1"
                        }
                    }
                },
                {
                    opcode: 'lightOff',
                    text: formatMessage(
                    {
                        id: 'lightOff',
                        default: '[LIGHT] off',
                        description: 'OFF'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                         //   defaultValue: "Light 1"

                        }
                    }
                },
                {
                    opcode: 'lightOnFade',
                    text: formatMessage(
                    {
                        id: 'lightOnFade',
                        default: '[LIGHT] on fade [FADE] seconds',
                        description: 'fade on'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        FADE:
                        {

                            type: ArgumentType.NUMBER,
                            defaultValue: 1.0
                        }

                    }
                },
                {
                    opcode: 'lightOffFade',
                    text: formatMessage(
                    {
                        id: 'lightOffFade',
                        default: '[LIGHT] off fade [FADE] seconds',
                        description: 'fade off'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        FADE:
                        {

                            type: ArgumentType.NUMBER,
                            defaultValue: 1.0
                        }

                    }
                },
                {
                    opcode: 'lightColor',
                    text: formatMessage(
                    {
                        id: 'lightColor',
                        default: '[LIGHT] color [COLOR]',
                        description: 'light color'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        COLOR:
                        {
                            type: ArgumentType.COLOR,
                        }

                    }
                },
                {
                    opcode: 'lightColorFade',
                    text: formatMessage(
                    {
                        id: 'lightColorFade',
                        default: '[LIGHT] color [COLOR] fade [FADE]',
                        description: 'light color fade'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        COLOR:
                        {
                            type: ArgumentType.COLOR,
                        },
                        FADE:
                        {

                            type: ArgumentType.NUMBER,
                            defaultValue: 1.0
                        }

                    }
                },
                {
                    opcode: 'lightColorRGB',
                    text: formatMessage(
                    {
                        id: 'lightColorRGB',
                        default: '[LIGHT] color r:[R] g:[G] b:[B]',
                        description: 'light color rgb'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        R:
                        {
                            type: ArgumentType.NUMBER,
                            defaultValue: 255
                        },
                        G:
                        {
                             type: ArgumentType.NUMBER,
                             defaultValue: 0
                        },
                        B:
                        {
                             type: ArgumentType.NUMBER,
                             defaultValue: 128
                        }
                    }
                },
                {
                    opcode: 'lightColorRGBFade',
                    text: formatMessage(
                    {
                        id: 'lightColorRGBFade',
                        default: '[LIGHT] color r:[R] g:[G] b:[B] fade [FADE]',
                        description: 'light color rgb'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        LIGHT:
                        {
                            type: ArgumentType.STRING,
                            menu: 'lights',
                            //    defaultValue: "No Lights"
                        },
                        R:
                        {
                            type: ArgumentType.NUMBER,
                            defaultValue: 255
                        },
                        G:
                        {
                             type: ArgumentType.NUMBER,
                             defaultValue: 0
                        },
                        B:
                        {
                             type: ArgumentType.NUMBER,
                             defaultValue: 128
                        },
                        FADE:
                        {

                            type: ArgumentType.NUMBER,
                            defaultValue: 1.0
                        }
                    }
                },
                "---",
                "---",
                "---",
                {
                    opcode: 'unpair',
                    text: formatMessage(
                    {
                        id: 'unpair',
                        default: 'unpair',
                        description: 'unpair'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                    }
                }
                ],
                menus:
                {
                    lights: 'getItemsForLightsMenu'
                }
            };
        }
        else
        {


            return {
                id: 'hue',
                name: 'Hue Lights',
                blockIconURI: blockIconURI,
                showStatusButton: true,
                blocks: [
                {
                    opcode: 'setServer',
                    text: formatMessage(
                    {
                        id: 'setServer',
                        default: 'Setup Philips Hue IP [IP] port [PORT]',
                        description: 'setup'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        IP:
                        {
                            type: ArgumentType.STRING,
                            defaultValue: "192.168.4.40"
                        },
                        PORT:
                        {
                            type: ArgumentType.STRING,
                            defaultValue: "443"
                        }
                    }
                }]
            }
        }
    }




    hexToRgb(hex)
    {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] :
            null;
    }

    waitAndCall(time)
    {
        return new Promise(resolve =>
        {
            setTimeout(() =>
            {
                resolve();
            }, time * 1000);
        });
    }

    fadeMap(fade)
    {
        return Math.round(parseFloat(fade) * 8);

    }

    getHueUser(server, port)
    {
        this.tryToMakeUser(server, port);

        //bypass pairing for testing
        //this.setUpCookie(server, port, "");
    }

    setUpCookie(server, port, username)
    {
        alert("You're good to go. You won't have to reconnect next time.");

        var url = "https://" + server + ":" + port + "/api/" + username + "/";

        this.createCookie("lightserver", url);
        console.log("username: " + url);
        this.configCallback();

        document.location.reload();
    }

    tryToMakeUser(server, port)
    {

        var url = "https://" + server + ":" + port + "/api";
        var command = {
            "devicetype": "scratchx#extension"
        };
        fetch(url,
            {
                method: 'post',
                body: JSON.stringify(command)
            })
            .then(response => response.text())
            .then(responseText =>
            {
                const data = JSON.parse(responseText);

                try
                {
                    var success = data[0]["success"];
                    if (success)
                    {
                        var username = success["username"];

                        this.setUpCookie(server, port, username);
                    }
                    else
                    {
                        var error = data[0]["error"];
                        if (error)
                        {
                            var description = error["description"];
                            if (description == "link button not pressed")
                            {
                                if (confirm("Please walk over and press the pairing button on top of the Hue base and then come back and press OK."))
                                {

                                    let ext = this;
                                    window.setTimeout(function()
                                    {
                                        ext.tryToMakeUser(server, port);
                                    }, 200);

                                    return;
                                }
                                else
                                {
                                    this.configCallback();
                                }
                            }
                            else
                            {
                                alert("Sorry, an unexpected error occured: " + description);
                                this.configCallback();
                            }
                        }
                        else
                        {
                            alert("Sorry, an unexpected thing occured: " + JSON.stringify(data));
                            this.configCallback();
                        }
                    }
                }
                catch (err)
                {
                    alert("Sorry, a very unexpected thing occured:" + err);
                    this.configCallback();
                }
            })
            .catch(err =>
            {

                console.log("Error from api config: " + err);
                alert("Sorry, it could not connect to your Hue base. Do you have the IP and port correct?");

                this.configCallback();
            });
    }


    eraseCookie(name)
    {
        console.log("remove cookie: " + name);
        this.createCookie(name, "", -1);
    }



    pingGroups()
    {
        let ext = this;
        var url = this.lightserver + "groups";
        fetch(url,
            {
                method: 'get'
            })
            .then(response => response.text())
            .then(responseText =>
            {
                const data = JSON.parse(responseText);


                console.log(data);
                try
                {
                    for (var key in data)
                    {
                        if (data[key]["lights"].length > 0)
                        {
                            ext.groups[key] = data[key];
                            ext.menuNames.push(data[key]["name"]);
                        }
                    }
                }
                catch (err)
                {
                    console.log(err);

                }
                console.log(ext.menuNames);
                if (ext.menuNames.length > 0)
                {
                    ext.gotLights = true;
                }
                else
                {
                    errMessage = 'No lights found.';
                }
                // registerExtension();
            })
            .catch(err =>
            {
                errMessage = 'Error connecting.';
            });
    }


    pingLights()
    {
        let ext = this;

        var url = this.lightserver + "lights";
        fetch(url,
            {
                method: 'get'
            })
            .then(response => response.text())
            .then(responseText =>
            {
                const data = JSON.parse(responseText);

                this.menuNames = [];

                console.log(data);
                try
                {
                    for (var key in data)
                    {
                        if (data[key]["uniqueid"])
                        {
                            ext.lights[key] = data[key];

                            ext.menuNames.push(data[key]["name"]);

                        }
                    }
                }
                catch (err)
                {
                    console.log(err);
                }

                ext.pingGroups();
            })
            .catch(err =>
            {
                errMessage = 'Error connecting.';
            })
    }

    createCookie(name, value, days)
    {
        if (days)
        {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    readCookie(name)
    {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++)
        {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    findLightID(lightName)
    {
        var group = false;
        for (var key in this.groups)
        {
            if (this.groups[key]["name"] == lightName)
            {
                group = true;
                return [group, key];
            }
        }
        for (var key in this.lights)
        {
            if (this.lights[key]["name"] == lightName)
            {
                return [group, key];
            }
        }
    }

    sendLightColorCommand(lightName, HSV, fade)
    {
        var result = this.findLightID(lightName);
        if (result)
        {
            var group = result[0];
            var lightID = result[1];

            this.sendLightCommand(lightID,
            {
                "on": true,
                "sat": HSV["s"],
                "bri": HSV["v"],
                "hue": HSV["h"],
                "transitiontime": fade
            }, group);
        }
    }

    sendLightOnOffCommand(lightName, onOff, fade)
    {
        var result = this.findLightID(lightName);
        if (result)
        {
            var group = result[0];
            var lightID = result[1];

            this.sendLightCommand(lightID,
            {
                "on": onOff,
                "transitiontime": fade,
                "bri": ((onOff) ? 254 : 0)
            }, group);
        }
    }

    rgb2hsv(rgb)
    {
        var rr, gg, bb,
            r = rgb[0] / 255,
            g = rgb[1] / 255,
            b = rgb[2] / 255,
            h, s,
            v = Math.max(r, g, b),
            diff = v - Math.min(r, g, b),
            diffc = function(c)
            {
                return (v - c) / 6 / diff + 1 / 2;
            };

        if (diff == 0)
        {
            h = s = 0;
        }
        else
        {
            s = diff / v;
            rr = diffc(r);
            gg = diffc(g);
            bb = diffc(b);

            if (r === v)
            {
                h = bb - gg;
            }
            else if (g === v)
            {
                h = (1 / 3) + rr - bb;
            }
            else if (b === v)
            {
                h = (2 / 3) + gg - rr;
            }
            if (h < 0)
            {
                h += 1;
            }
            else if (h > 1)
            {
                h -= 1;
            }
        }
        return {
            h: Math.round(h * 65535),
            s: Math.round(s * 255),
            v: Math.round(v * 255)
        };
    }

    sendLightCommand(lightID, command, group)
    {
        var url = this.lightserver + ((group) ? "groups" : "lights") + "/" + lightID + "/" + ((group) ? "action" : "state");
        console.log("url: " + url + " command: " + JSON.stringify(command));
        fetch(url,
            {
                method: 'put',
                body: JSON.stringify(command)
            })
            .catch(err =>
            {
                errMessage = 'Error connecting: ' + err;
            });

    }

    lightColor(args)
    {
        let light = args.LIGHT;
        let color = args.COLOR;
        this.sendLightColorCommand(light, this.rgb2hsv(this.hexToRgb(color)), 0);
        return this.waitAndCall(this.noWait);
    }

    lightColorRGB(args)
    {
        let light = args.LIGHT;
        let r = args.R;
        let g = args.G;
        let b = args.B;
        this.sendLightColorCommand(light, this.rgb2hsv([r, g, b]), 0);
        return this.waitAndCall(this.noWait);
    }


    lightColorRGBFade(args)
    {
        let light = args.LIGHT;
        let r = args.R;
        let g = args.G;
        let b = args.B;
        let fade = args.FADE;

        fad = this.fadeMap(fade)
        this.sendLightColorCommand(light, this.rgb2hsv([r, g, b]), fad);
        return this.waitAndCall(fade);
    }


    lightColorFade(args)
    {
        let light = args.LIGHT;
        let color = args.COLOR;
        let fade = args.FADE;
        fad = this.fadeMap(fade)
        this.sendLightColorCommand(light, this.rgb2hsv(this.hexToRgb(color)), fad);
        return this.waitAndCall(fade);
    }

    lightOn(args)
    {
        let light = args.LIGHT;
        this.sendLightOnOffCommand(light, true, 0);
        return this.waitAndCall(this.noWait);
    }

    lightOff(args)
    {
        let light = args.LIGHT;
        this.sendLightOnOffCommand(light, false, 0);
        return this.waitAndCall(this.noWait);
    }

    lightOnFade(args)
    {
        let light = args.LIGHT;
        let fade = args.FADE;
        fad = this.fadeMap(fade)
        this.sendLightOnOffCommand(light, true, fad);
        return this.waitAndCall(fade);
    }

    lightOffFade(args)
    {
        let light = args.LIGHT;
        let fade = args.FADE;
        fad = this.fadeMap(fade)
        this.sendLightOnOffCommand(light, false, fad);
        return this.waitAndCall(fade);
    }
    setServer(args)
    {
        let server = args.IP;
        let port = args.PORT;
        return new Promise(resolve =>
        {
            this.configCallback = resolve;
            this.getHueUser(server, port)
        });
    }

    unpair(args)
    {
        if (confirm("Are you sure you want to unpair?"))
        {
            this.eraseCookie("lightserver");
            document.location.reload();
        }
    }

    _stringMenu(menu)
    {
        var m = [];
        for (let i = 0; i < menu.length; i++)
        {
            const obj = {};
            obj.text = menu[i];
            obj.value = menu[i];
            m.push(obj);
        }
        return m;
    }

}


module.exports = Scratch3HueBlocks;
