import app from '@/main'
import FileDownloader from 'js-file-downloader'
import option from '@/function/option'
import cmp from 'semver-compare'
import appInfo from '../../../package.json'
import Umami from '@stapxs/umami-logger-typescript'


import AboutPan from '@/components/AboutPan.vue'
import UpdatePan from '@/components/UpdatePan.vue'
import WelPan from '@/components/WelPan.vue'

import { Rule, Stylesheet, Declaration } from 'css'
import { LogType, Logger, PopInfo, PopType } from '@/function/base'
import { Connector, login } from '@/function/connect'
import { runtimeData } from '@/function/msg'
import { BaseChatInfoElem } from '@/function/elements/information'
import { hslToRgb, rgbToHsl } from '@/function/utils/systemUtil'
import { toRaw, nextTick } from 'vue'
import { sendMsgRaw } from './msgUtil'
import { parseMsg } from '../sender'

const popInfo = new PopInfo()
const logger = new Logger()

/**
 * 滚动到目标消息（不自动加载）
 * @param seqName DOM 名
 */
export function scrollToMsg (seqName: string, showAnimation: boolean): boolean {
    const msg = document.getElementById(seqName)
    if (msg) {
        const pan = document.getElementById('msgPan')
        if (pan !== null) {
            if (showAnimation === false) {
                pan.style.scrollBehavior = 'unset'
            } else {
                pan.style.scrollBehavior = 'smooth'
            }
            pan.scrollTop = msg.offsetTop - msg.offsetHeight + 10
            pan.style.scrollBehavior = 'smooth'
            msg.style.transition = 'background 1s'
            msg.style.background = 'rgba(0, 0, 0, 0.06)'
            setTimeout(() => {
                msg.style.background = 'unset'
                setTimeout(() => {
                    msg.style.transition = 'background .3s'
                }, 1100)
            }, 3000)
            return true
        }
    }
    return false
}

/**
 * 打开链接
 * @param url 链接
 */
export function openLink(url: string, external = false) {
    // 判断是不是 Electron，是的话打开内嵌 iframe
    if(runtimeData.tags.isElectron) {
        if(!external) {
            runtimeData.popBoxList = []
            const popInfo = {
                html: `<iframe src="${url}" class="view-iframe"></iframe>`,
                full: true,
                button: [
                    {
                        text: app.config.globalProperties.$t('请不要在内嵌页面中输入敏感信息，内嵌页面并不安全。'),
                        fun: () => undefined
                    },
                    {
                        text: app.config.globalProperties.$t('打开…'),
                        fun: () => {
/*                             const shell = null
                            if (shell) {
                                shell.openExternal(url)
                            } */
                            runtimeData.popBoxList.shift()
                        }
                    },
                    {
                        text: app.config.globalProperties.$t('关闭'),
                        master: true,
                        fun: () => { runtimeData.popBoxList.shift() }
                    }
                ]
            }
            runtimeData.popBoxList.push(popInfo)
        }/*  else {
            const electron = window.require('electron')
            const shell = electron ? electron.shell : null
            if (shell) {
                shell.openExternal(url)
            }
        } */
    } else {
        window.open(url)
    }
}

/**
 * 加载历史消息
 * @param info 聊天基本信息
 */
export function loadHistory(info: BaseChatInfoElem) {
    runtimeData.messageList = []
    if (!loadHistoryMessage(info.id, info.type)) {
        new PopInfo().add(PopType.ERR, app.config.globalProperties.$t('加载历史消息失败'), false)
    }
}
export function loadHistoryMessage(id: number, type: string, count = 20, echo = 'getChatHistoryFist') {
    let name
    const fullPage = runtimeData.jsonMap.message_list?.pagerType == 'full'
    if(runtimeData.jsonMap.message_list && type != 'group') {
        name = runtimeData.jsonMap.message_list.private_name
    } else {
        name = runtimeData.jsonMap.message_list.name
    }

    Connector.send(
        name ?? 'get_chat_history',
        {
            group_id: type == 'group' ? id : undefined,
            user_id: type != 'group' ? id : undefined,
            message_id: 0,
            count: fullPage ? runtimeData.messageList.length + count : count
        },
        echo
    )
    return true
}

/**
 * 重新加载用户列表
 */
export function reloadUsers() {
    // 加载用户列表
    if (login.status) {
        runtimeData.userList = []
        let friendName = 'get_friend_list'
        let groupName = 'get_group_list'
        if(runtimeData.jsonMap.user_list?.name) {
            friendName = runtimeData.jsonMap.user_list.name.split('|')[0]
            groupName = runtimeData.jsonMap.user_list.name.split('|')[1]
        } else if(runtimeData.jsonMap.friend_list?.name &&
            runtimeData.jsonMap.group_list?.name) {
            friendName = runtimeData.jsonMap.friend_list.name
            groupName = runtimeData.jsonMap.group_list.name
        }
        Connector.send(friendName, {}, 'getFriendList')
        Connector.send(groupName, {}, 'getGroupList')
        // 获取系统消息
        Connector.send('get_system_msg', {}, 'getSystemMsg')
    }
}

export function reloadCookies() {
    Connector.send('get_cookies', { 'domain': 'qun.qq.com' }, 'getCookies_qun.qq.com')
}

/**
 * 通过用户和消息 ID 跳转到对应的消息
 * @param id 
 * @param msgId 
 */
export function jumpToChat(userId: string, msgId: string) {
    if(runtimeData.chatInfo.show.id != Number(userId)) {
        const body = document.getElementById('user-' + userId)
        if (body === null) {
            // 从缓存列表里寻找这个 ID
            for (let i = 0; i < runtimeData.userList.length; i++) {
                const item = runtimeData.userList[i]
                const id = item.user_id !== undefined ? item.user_id : item.group_id
                if (String(id) === userId) {
                    // 把它插入到显示列表的第一个
                    runtimeData.showList?.unshift(item)
                    nextTick(() => {
                        const bodyNext = document.getElementById('user-' + userId)
                        if (bodyNext !== null) {
                            // 添加一个消息跳转标记
                            bodyNext.dataset.jump = msgId
                            // 然后点一下它触发聊天框切换
                            bodyNext.click()
                        }
                    })
                    break
                }
            }
        } else {
            body.click()
        }
    } else {
        // 当前聊天已经打开，是没有焦点触发的消息通知；直接滚动到消息。
        scrollToMsg(msgId, true)
    }
}

/**
 * 下载文件
 * @param url 文件链接
 * @param process 下载中回调
 */
export function downloadFile (url: string, name: string, onprocess: (event: ProgressEvent & {[key: string]: any}) => undefined) {
    if(document.location.protocol == 'https:') {
        // 判断下载文件 URL 的协议
        // PS：Chrome 不会对 http 下载的文件进行协议升级
        if(url.toLowerCase().startsWith('http:')) {
            url = 'https' + url.substring(url.indexOf('://'))
        }
    }
    if(runtimeData.tags.isElectron) {
        new FileDownloader({
            url: url,
            autoStart: true,
            process: onprocess,
            nameCallback: function () {
                return name
            }
        })
    } else {
/*         if(runtimeData.reader) {
            runtimeData.reader.on('sys:downloadBack', (event, params) => {
                onprocess(params)
            })
            runtimeData.reader.send('sys:download', {
                downloadPath: url,
                fileName: name
            })
        } */
    }
}

/**
 * 使用 gtk CSS 更新 Border Card UI 配色表
 * @param cssStr css 字符串
 */
function updateGTKTheme(cssStr: string) {
    if(option.get('log_level') == 'debug') {
        logger.add(LogType.UI, 'GTK 主题 CSS 字符串：' + cssStr)
    }
    const css = window.require('css')
    let cssObj = undefined
    let color = '#000'
    // color-main
    color = cssStr.substring(cssStr.indexOf('@define-color theme_fg_color') + 29)
    color = color.substring(0, color.indexOf(';'))
    document.documentElement.style.setProperty('--color-main', color)
    // color-bg
    color = cssStr.substring(cssStr.indexOf('@define-color theme_bg_color') + 29)
    color = color.substring(0, color.indexOf(';'))
    document.documentElement.style.setProperty('--color-bg', color)
    document.documentElement.style.setProperty('--color-card', color)
    // color-card
    color = cssStr.substring(cssStr.indexOf('.context-menu {'))
    color = color.substring(0, color.indexOf('}') + 1)
    cssObj = css.parse(color, {silent: true}) as Stylesheet
    if(cssObj.stylesheet) {
        const colorGet = ((cssObj.stylesheet.rules[0] as Rule).declarations?.filter((item: Declaration) => {
            return item.property == 'background-color'
        })[0] as Declaration).value
        if(colorGet) {
            document.documentElement.style
                .setProperty('--color-card-1', colorGet)
        }
    }
    // color-card-1
    color = cssStr.substring(cssStr.indexOf('.context-menu .view:selected {'))
    color = color.substring(0, color.indexOf('}') + 1)
    cssObj = css.parse(color, {silent: true}) as Stylesheet
    if(cssObj.stylesheet) {
        const colorGet = ((cssObj.stylesheet.rules[0] as Rule).declarations?.filter((item: Declaration) => {
            return item.property == 'background-color'
        })[0] as Declaration).value
        if(colorGet) {
            document.documentElement.style
                .setProperty('--color-card-2', colorGet)
        }
    }
    // color-card-2
    // color = cssStr.substring(cssStr.indexOf('.context-menu menuitem:hover {'))
    // color = color.substring(0, color.indexOf('}') + 1)
    // cssObj = css.parse(color, {silent: true}) as Stylesheet
    // if(cssObj.stylesheet) {
    //     const colorGet = ((cssObj.stylesheet.rules[0] as Rule).declarations?.filter((item: Declaration) => {
    //         return item.property == 'background-color'
    //     })[0] as Declaration).value
    //     if(colorGet) {
    //         document.documentElement.style
    //             .setProperty('--color-card-2', colorGet)
    //     }
    // }
    // color-font
    color = cssStr.substring(cssStr.indexOf('@define-color theme_text_color') + 31)
    color = color.substring(0, color.indexOf(';'))
    document.documentElement.style.setProperty('--color-font', color)
    // color-font-1
    color = cssStr.substring(cssStr.indexOf('@define-color theme_unfocused_text_color') + 41)
    color = color.substring(0, color.indexOf(';'))
    document.documentElement.style.setProperty('--color-font-1', color)
    document.documentElement.style.setProperty('--color-font-2', color)
}

/**
 * electron：加载系统主题适配
 */
/* export async function loadSystemThemeColor() {
    // 加载 GTK 主题适配（以及主题更新回调监听）
    if (runtimeData.reader) {
        // 主题更新回调
        runtimeData.reader.on('sys:updateGTKTheme', (event, params) => {
            if(option.get('opt_auto_gtk') == true) {
                updateGTKTheme(params.css)
            }
        })
        updateGTKTheme(await runtimeData.reader.invoke('sys:getGTKTheme'))
        
    }
}

export async function loadWinColor() {
    if (runtimeData.reader) {
        // 获取系统主题色
        updateWinColor(await runtimeData.reader.invoke('sys:getWinColor'))
    }
} */

export function updateWinColor(color: string) {
    if(process.platform == 'win32') {
        const red = parseInt(color.substr(0, 2), 16)
        const green = parseInt(color.substr(2, 2), 16)
        const blue = parseInt(color.substr(4, 2), 16)
        // 平衡颜色亮度
        const hsl = rgbToHsl(red, green, blue)
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const autodark = option.get('opt_auto_dark')
        const dark = option.get('opt_dark')
        if ((autodark == true && media.matches) || (autodark != true && dark == true)) {
            hsl[2] = 0.8
        } else {
            hsl[2] = 0.3
        }
        const finalColor = hslToRgb(hsl[0], hsl[1], hsl[2])
        document.documentElement.style.setProperty('--color-main', 'rgb(' + finalColor[0] + ',' + finalColor[1] + ',' + finalColor[2] + ')')
    } else {
        document.documentElement.style.setProperty('--color-main', '#' + color.substring(0, 6) + 'CF')
    
    }
}

/* export function createMenu() {
    const { $t } = app.config.globalProperties
    // MacOS：初始化菜单
    if (runtimeData.reader) {
        // 初始化菜单
        const menuTitles = {} as { [key: string]: string }
        menuTitles.success = $t('应用显示完成，应用初始化完成！欢迎使用 {name}！', { name: $t('Stapxs QQ Lite')})

        menuTitles.title = $t('Stapxs QQ Lite')
        menuTitles.about = $t('关于') + ' ' + $t('Stapxs QQ Lite')
        menuTitles.update = $t('检查更新…')
        menuTitles.hide = $t('隐藏') + ' ' + $t('Stapxs QQ Lite')
        menuTitles.hideOthers = $t('隐藏其他')
        menuTitles.unhide = $t('全部显示')
        menuTitles.quit = $t('退出') + ' ' + $t('Stapxs QQ Lite')

        menuTitles.edit = $t('编辑')
        menuTitles.undo = $t('撤销')
        menuTitles.redo = $t('重做')
        menuTitles.cut = $t('剪切')
        menuTitles.copy = $t('复制')
        menuTitles.paste = $t('粘贴')
        menuTitles.selectAll = $t('全选')

        menuTitles.account = $t('账户')
        menuTitles.login = $t('连接')
        menuTitles.logout = $t('登出')
        menuTitles.userList = $t('用户列表（{count}）', { count: runtimeData.userList.length })
        menuTitles.flushUser = $t('刷新列表…')

        menuTitles.help = $t('帮助')
        menuTitles.doc = $t('帮助文档')
        menuTitles.feedback = $t('在 Github 上反馈问题')
        menuTitles.license = $t('许可协议')

        runtimeData.reader.send('sys:createMenu', menuTitles)
    }
}

export function updateMenu(config: {id: string, action: string, value: any}) {
    // MacOS：更新菜单
    if (runtimeData.reader) {
        runtimeData.reader.send('sys:updateMenu', config)
    }
}

export function createIpc() {
    if (runtimeData.reader) {
        runtimeData.reader.on('bot:flushUser', () => {
            reloadUsers()
            popInfo.add(PopType.INFO, app.config.globalProperties.$t('刷新用户列表成功'))
        })
        runtimeData.reader.on('bot:logout', () => {
            option.remove('auto_connect')
            Connector.close()
        })
        runtimeData.reader.on('bot:quickReply', (event, data) => {
            sendMsgRaw(data.id, data.type, parseMsg(
                '[SQ:0]' + data.content,
                [{ type: 'reply', id: String(data.msg) }],
                []
            ), true)
            // 去消息列表内寻找，去除新消息标记
            for (let i = 0; i < runtimeData.onMsgList.length; i++) {
                if (runtimeData.onMsgList[i].group_id == data.id || runtimeData.onMsgList[i].user_id == data.id) {
                    runtimeData.onMsgList[i].new_msg = false
                    break
                }
            }
        })

        runtimeData.reader.on('sys:handleUri', (event, data) => {
            logger.info(JSON.stringify(data))
        })
        runtimeData.reader.on('app:about', () => {
            const popInfo = {
                title: app.config.globalProperties.$t('关于') + ' ' + app.config.globalProperties.$t('Stapxs QQ Lite'),
                template: AboutPan,
                allowQuickClose: false
            }
            runtimeData.popBoxList.push(popInfo)
        })
        runtimeData.reader.on('app:changeTab', (event, name) => {
            document.getElementById('bar-' + name.toLowerCase())?.click()
        })
        runtimeData.reader.on('app:openLink', (event, link) => {
            openLink(link)
        })
        runtimeData.reader.on('app:error', (event, text) => {
            new Logger().add(LogType.ERR, text)
        })
        runtimeData.reader.on('app:jumpChat', (event, info) => {
            jumpToChat(info.userId, info.msgId)
        })
        
        // 后端连接模式
        runtimeData.reader.on('onebot:onopen', (event, data) => {
            Connector.onopen(data.address, data.token)
        })
        runtimeData.reader.on('onebot:onmessage', (event, message) => {
            Connector.onmessage(message)
        })
        runtimeData.reader.on('onebot:onclose', (event, data) => {
            Connector.onclose(data.code, data.reason, data.address, data.token)
        })
    }
} */

export function loadAppendStyle() {
    const platform = runtimeData.tags.platform
    logger.info('正在装载补充样式……')
    if (runtimeData.tags.isElectron) {
        import('@/assets/css/append/append_new.css').then(() => {
            logger.info('UI 2.0 附加样式加载完成')
        })
    }
    try {
        import(`@/assets/css/append/append_${platform}.css`).then(() => {
            logger.info(`${platform} 平台附加样式加载完成`)
        })
    } catch (e) {
        logger.info('未找到对应平台的附加样式')
    }
    let subVersion = runtimeData.tags.release?.split('.') as any
    subVersion = subVersion ? Number(subVersion[2]) : 0
    if (runtimeData.tags.isElectron && (platform == 'darwin' || (platform == 'win32' && subVersion > 22621))) {
        import('@/assets/css/append/append_vibrancy.css').then(() => {
            logger.info('透明 UI 附加样式加载完成')
        })
    }
    if(runtimeData.tags.isElectron && platform == 'linux') {
       /*  const gnomeExtInfo = runtimeData.reader?.invoke('sys:getGnomeExt')
        if(gnomeExtInfo) {
            gnomeExtInfo.then((info: any) => {
                if(info['enable-all'] == 'true' || info['whitelist'].indexOf('stapxs-qq-lite') != -1) {
                    import('@/assets/css/append/append_vibrancy.css').then(() => {
                        logger.info('透明 UI 附加样式加载完成')
                    })
                    import('@/assets/css/append/append_gnome.css').then(() => {
                        logger.info('Blur my sell 附加样式加载完成')
                    })
                }
            })
        } */
    }
    // 全透明模式
    if(option.get('vibrancy_mode') != 'default') {
        import('@/assets/css/append/append_full_transparent.css').then(() => {
            logger.info('全透明 UI 附加样式加载完成')
        })
        // 将 card 颜色透明化
        document.documentElement.style.setProperty('--color-bg', 'rgba(var(--color-bg-rgb), 0.5)')
        document.documentElement.style.setProperty('--color-card', 'rgba(var(--color-card-rgb), 0.5)')
        document.documentElement.style.setProperty('--color-card-1', 'rgba(var(--color-card-1-rgb), 0.5)')
        document.documentElement.style.setProperty('--color-card-2', 'rgba(var(--color-card-2-rgb), 0.5)')
        // 恢复设置项
        option.save('vibrancy_mode', 'default')
    }
}

export function checkUpdate() {
    // 获取最新的 release 信息
    const packageUrl = 'https://api.github.com/repos/stapxs/Stapxs-QQ-Lite-2.0/releases/latest'
    fetch(packageUrl).then((response) => {
        if (response.ok) {
            response.json().then((data) => {
                showUpadteLog(data)
            })
        }
    })
    localStorage.setItem('version', appInfo.version)
}

function showUpadteLog(data: any) {
    const appVersion = appInfo.version                      // 当前版本
    const cacheVersion = localStorage.getItem('version')    // 缓存版本
    // 这儿有两种情况：
        //    如果当前版本小于获取到的版本就是有更新
        //    如果缓存版本小于获取到的版本但是当前版本等于获取到的版本就是更新完成首次启动
    const lastestVersion = data.tag_name.substring(1)
    if(cmp(appVersion, lastestVersion) == -1) {
        // 有更新
        showReleaseLog(data, false)
    }
    if(cacheVersion && cmp(appVersion, lastestVersion) == 0 && cmp(cacheVersion, lastestVersion) == -1) {
        // 更新完成首次启动
        showReleaseLog(data, true)
    }
}

function showReleaseLog(data: any, isUpdated: boolean) {
    const $t = app.config.globalProperties.$t
    let msg = data.body
    // 处理 title，取开头到下一个 “\r\n” 之间的内容
    const title = msg.split('\r\n')[0].substring(1)
    // 处理 msg，取 “## 更新内容” 到下一个 “##” 之间的内容
    const start = msg.indexOf('## 更新内容\r\n')
    if (start != -1) {
        msg = msg.substring(start + 9)
        const end = msg.indexOf('##')
        if (end != -1) {
            msg = msg.substring(0, end)
        }
    }
    msg = title + '\r\n' + msg
    const info = {
        version: (isUpdated ? localStorage.getItem('version') + ' -> ' : '') + data.tag_name.substring(1),
        date: data.published_at,
        user: {
            name: data.author.login,
            avatar: data.author.avatar_url,
            url: data.author.html_url
        },
        message: msg,
        updated: isUpdated
    }
    const buttonGoUpdate = runtimeData.tags.isElectron ? [
        {
            text: $t('知道了'),
            fun: () => runtimeData.popBoxList.shift()
        }, {
            text: $t('下载更新…'),
            master: true,
            fun: () => openLink(data.html_url, true)
        }
    ] : [
        {
            text: $t('查看…'),
            fun: () => openLink(data.html_url)
        }, {
            text: $t('刷新页面'),
            master: true,
            fun: () => location.reload()
        }
    ]
    const popInfo = {
        template: UpdatePan,
        templateValue: toRaw(info),
        button: isUpdated ? [
            {
                text: $t('查看…'),
                fun: () => openLink(data.html_url, true)
            }, {
                text: $t('知道了'),
                master: true,
                fun: () => { runtimeData.popBoxList.shift() }
            }
        ] : buttonGoUpdate
    }
    runtimeData.popBoxList.push(popInfo)
}

export function checkOpenTimes() {
    const $t = app.config.globalProperties.$t
    const times = localStorage.getItem('times')
    if (times != null) {
        const getTimes = Number(times) + 1
        localStorage.setItem('times', getTimes.toString())
        if (getTimes % 50 == 0) {
            // 构建 HTML
            let html = '<div style="display:flex;flex-direction:column;padding:10px 5%;align-items:center;">'
            html += '<svg style="height:2rem;fill:var(--color-font);margin-bottom:20px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M16 0H144c5.3 0 10.3 2.7 13.3 7.1l81.1 121.6c-49.5 4.1-94 25.6-127.6 58.3L2.7 24.9C-.6 20-.9 13.7 1.9 8.5S10.1 0 16 0zM509.3 24.9L401.2 187.1c-33.5-32.7-78.1-54.2-127.6-58.3L354.7 7.1c3-4.5 8-7.1 13.3-7.1H496c5.9 0 11.3 3.2 14.1 8.5s2.5 11.5-.8 16.4zM432 336c0 97.2-78.8 176-176 176s-176-78.8-176-176s78.8-176 176-176s176 78.8 176 176zM264.4 241.1c-3.4-7-13.3-7-16.8 0l-22.4 45.4c-1.4 2.8-4 4.7-7 5.1L168 298.9c-7.7 1.1-10.7 10.5-5.2 16l36.3 35.4c2.2 2.2 3.2 5.2 2.7 8.3l-8.6 49.9c-1.3 7.6 6.7 13.5 13.6 9.9l44.8-23.6c2.7-1.4 6-1.4 8.7 0l44.8 23.6c6.9 3.6 14.9-2.2 13.6-9.9l-8.6-49.9c-.5-3 .5-6.1 2.7-8.3l36.3-35.4c5.6-5.4 2.5-14.8-5.2-16l-50.1-7.3c-3-.4-5.7-2.4-7-5.1l-22.4-45.4z"/></svg>'
            html += `<span>${$t('好耶！Stapxs QQ Lite 已经被打开 {times} 次了！', { times: getTimes })}</span>`
            html += `<span>${$t('真的不去点个 star 吗 ……')}</span>`
            html += '</div>'
            const popInfo = {
                title: $t('好耶'),
                svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>',
                html: html,
                button: [
                    {
                        text: $t('不要'),
                        fun: () => { runtimeData.popBoxList.shift() }
                    }, {
                        text: $t('好喔'),
                        master: true,
                        fun: () => { openLink('https://github.com/Stapxs/Stapxs-QQ-Lite-2.0'); runtimeData.popBoxList.shift(); }
                    }
                ]
            }
            runtimeData.popBoxList.push(popInfo)
        }
    } else {
        localStorage.setItem('times', '1')
        // 首次打开，显示首次打开引导信息
        const popInfo = {
            template: WelPan,
            button: [
                {
                    text: 'close',
                    master: true,
                    fun: () => { runtimeData.popBoxList.shift() }
                }
            ]
        }
        runtimeData.popBoxList.push(popInfo)
    }
}

export function checkNotice() {
    const url = 'https://lib.stapxs.cn/download/stapxs-qq-lite/notice-config.json'
    const fetchData = {
        time: new Date().getTime().toString()
    } as Record<string, string>
    fetch(url + '?' + new URLSearchParams(fetchData).toString())
        .then(response => response.json())
        .then(data => {
            // 获取已显示过的公告 ID
            let noticeShow = [] as number[]
            const showId = localStorage.getItem('notice_show')
            if (showId) {
                noticeShow = showId.split(',').map((id: string) => parseInt(id))
            }
            // 解析公告列表
            data.forEach((notice: any) => {
                let isShowInDate = false
                if (!notice.show_date) {
                    isShowInDate = true
                }
                else if (typeof notice.show_date == 'string' && new Date().toDateString() === new Date(notice.show_date).toDateString()) {
                    isShowInDate = true
                } else if (typeof notice.show_date == 'object') {
                    notice.show_date.forEach((date: number) => {
                        if (new Date().toDateString() === new Date(date).toDateString()) {
                            isShowInDate = true
                        }
                    })
                }
                if (notice.version == 2 && noticeShow.indexOf((notice.id).toString()) < 0 && isShowInDate) {
                    // 加载公告弹窗列表
                    for (let i = 0; i < notice.pops.length; i++) {
                        // 添加弹窗
                        const info = notice.pops[i]
                        const popInfo = {
                            title: info.title,
                            html: info.html ? info.html : '',
                            button: [
                                {
                                    text: (notice.pops.length > 1 && i != notice.pops.length - 1) ? app.config.globalProperties.$t('继续') : app.config.globalProperties.$t('确定'),
                                    master: true,
                                    fun: () => {
                                        // 添加已读记录
                                        if (noticeShow.indexOf(notice.id) < 0) {
                                            noticeShow.push(notice.id)
                                        }
                                        localStorage.setItem('notice_show', noticeShow.toString())
                                        // 关闭弹窗
                                        runtimeData.popBoxList.shift()
                                    }
                                }
                            ]
                        }
                        runtimeData.popBoxList.push(popInfo)
                    }
                }
            })
        })
}

/* export function BackendRequest(type: 'GET' | 'POST', url: string, cookies: string[], data: any = undefined) {
    if (runtimeData.reader) {
        runtimeData.reader.send('sys:requestHttp', {
            type: type,
            url: url,
            cookies: JSON.stringify(cookies),
            data: data
        })
    }
} */

export function loadJsonMap(name: string) {
    let msgPath = null as any
    if (name !== undefined) {
        try {
            // eslint-disable-next-line
            msgPath = require(`@/assets/pathMap/${name}.yaml`)
            logger.debug('加载映射表：' + msgPath.name)
            if(msgPath.redirect) {
                // eslint-disable-next-line
                const newMsgPath = require(`@/assets/pathMap/${msgPath.redirect}.yaml`)
                // 合并映射表
                Object.keys(msgPath).forEach((key) => {
                    if (key != 'name' && newMsgPath[key]) {
                        newMsgPath[key] = msgPath[key]
                    }
                })
                msgPath = newMsgPath
                logger.debug('加载映射表（重定向）：' + msgPath.name)
            }
            runtimeData.jsonMap = msgPath
        } catch (ex) {
            logger.debug('加载映射表失败：' + ex)
        }
    }
    return msgPath
}

// UM：统计事件统一上传方法
export function sendStatEvent(event: string, data: any) {
    if (!option.get('close_ga') && process.env.NODE_ENV == 'production') {
        Umami.trackEvent(event, data)
    }
}
