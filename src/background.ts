'use strict'

import path from 'path'
import packageInfo from '../package.json'
import log4js from 'log4js'

/* const isDevelopment = process.env.NODE_ENV !== 'production'
const isPrimary = app.requestSingleInstanceLock()
const logger = log4js.getLogger('background')
export let logLevel = isDevelopment ? 'debug' : 'info'

protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
]) */

/* export let win = undefined as BrowserWindow | undefined
export let touchBarInstance = undefined as touchBar | undefined */

/* async function createWindow() {
    if(new Store().get('opt_log_level')) {
        logLevel = (String) (new Store().get('opt_log_level')) ?? 'info'
    }
    logger.level = logLevel

    /* eslint-disable no-console
    console.log('')
    console.log(' _____ _____ _____ _____ __ __  \n' +
                '|   __|_   _|  _  |  _  |  |  | \n' +
                '|__   | | | |     |   __|-   -| \n' +
                '|_____| |_| |__|__|__|  |__|__| CopyRight © Stapx Steve')
    console.log('=======================================================')
    console.log('日志等级:', logLevel)
    /* eslint-enable no-console 
    logger.info('欢迎使用 Stapxs QQ Lite, 当前版本: ' + packageInfo.version)
    
    logger.info('启动平台架构：' + process.platform)
    logger.info('正在创建窗体 ……')
    Menu.setApplicationMenu(null)
    // 创建窗口
    const mainWindowState = windowStateKeeper({
        defaultWidth: 850,
        defaultHeight: 530
    })
    const store = new Store()
    const vibrancyMode = store.get('vibrancy_mode')
    let windowConfig = {
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: 350,
        minHeight: 450,
        icon: path.join(__dirname,'./public/img/icons/icon.png'),
        webPreferences: {
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: false
        },
        maximizable: false,
        fullscreen: false
    } as Electron.BrowserWindowConstructorOptions
    if(process.platform === 'darwin') {
        // macOS
        windowConfig = {
            ...windowConfig,
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 11, y: 10 },
            vibrancy: vibrancyMode == 'transparent' ? undefined : 'fullscreen-ui',
            transparent: true,

            visualEffectState: process.env.NODE_ENV 
                    === 'development' ? 'active' : 'followWindow'
        }
    } else if(process.platform === 'win32') {
        // Windows
        windowConfig = {
            ...windowConfig,
            backgroundColor: '#00000000',
            backgroundMaterial: vibrancyMode == 'transparent' ? undefined : 'acrylic',
            frame: false
        }
        store.set('opt_no_window', 'true')
    } else if(process.platform === 'linux') {
        // Linux
        windowConfig = {
            ...windowConfig,
            transparent: true,
            frame: false
        }
        store.set('opt_no_window', 'true')
    }
    win = new BrowserWindow(windowConfig)
    win.once('focus', () => {if(win)win.flashFrame(false)})
    mainWindowState.manage(win)     // 窗口状态管理器
    logger.info('创建窗体完成')
    // 注册 IPC 事务
    regIpcListener()
    // macOS：创建 TouchBar
    touchBarInstance = new touchBar(win)
    // 加载应用
    if (process.env.WEBPACK_DEV_SERVER_URL) {
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        win.loadURL('app://./index.html')
    }

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders) {
            const imageAddress = [
                'https://gchat.qpic.cn/gchatpic_new',
                'https://multimedia.nt.qq.com.cn/download'
            ]
            const ignoreAddress = [
                'devtools://',
                'chrome-extension://',
                'https://registry.npmjs.org',
                // 本地开发地址
                'http://localhost:8080',
                'http://127.0.0.1:8080',
                'http://localhost:8081',
                'http://127.0.0.1:8081'
            ]
            if(imageAddress.some((address) => details.url.startsWith(address))) {
                // 不缓存图片
                details.responseHeaders['cache-control'] = ['max-age=300']
                const contentType = details.responseHeaders['content-type']
                if(contentType && contentType[0]) {
                    const typeName = contentType[0].split('/')[1]
                    // 添加文件名方便下载
                    details.responseHeaders['content-disposition'] = ['inline; filename="image.' + typeName + '"']
                }
            } else if (!ignoreAddress.some((address) => details.url.startsWith(address))) {
                // 绕过 CSP 限制，X-Frame-Options 限制
                details.responseHeaders['content-security-policy'] = ['*']
                delete details.responseHeaders['x-frame-options']
                // 修改缓存时间
                if(details.url.indexOf('qlogo.cn') !== -1) {
                    // QQ 头像 URL 默认有 2592000（30 天）的缓存时间，这里修改为 3 天
                    details.responseHeaders['cache-control'] = ['max-age=259200']
                }
            }
        }
        callback({ cancel: false, responseHeaders: details.responseHeaders })
    })
}

app.on('open-url', (event, url) => {
    sendUrlToWindow(url)
})
app.on('second-instance', (event, cmd, workingDirectory) => {
    sendUrlToWindow(workingDirectory, cmd)
})
function sendUrlToWindow(url: string ,args: string[] = []) {
    win?.webContents.send('sys:handleUri', {
        url: url,
        args: args
    })
}

app.on('window-all-closed', () => {
    // 清空通知
    Object.keys(noticeList).forEach((key) => {
        noticeList[key].forEach((notice) => {
            notice.close()
        })
    })
    if (process.platform === 'win32')
    {
        app.removeAsDefaultProtocolClient('stapx-qq-lite')   // 取消默认协议
    }
    app.quit()
})

app.on('ready', async () => {
    // 单例模式
    if (!isPrimary) {
        app.quit()
        return
    }
    if (process.platform === 'win32')
    {
        app.setAppUserModelId('Stapx QQ Lite')              // 设置应用 ID
        app.setAsDefaultProtocolClient('stapx-qq-lite')     // 设置为默认协议
    }
    // 开发者工具
    if (isDevelopment && !process.env.IS_TEST) {
        try {
            await installExtension('nhdogjmejiglipccpnnnanhbledajbpd')
        } catch (e: unknown) {
            logger.error('Vue Devtools 安装失败：', (e as Error).toString())
        }
    }
    createWindow()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
} */
