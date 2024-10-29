/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */

module.exports = {
    devServer: {
        client: {
            overlay: false
        }
    },
    publicPath: process.env.NODEJS_ENV === 'github-actions'
        ? '/Stapxs-QQ-Lite-2.0/'
        : undefined
    ,
    transpileDependencies: true,
    productionSourceMap: false,
    configureWebpack: {
        devtool: process.env.NODE_ENV == 'development' ? 'eval-source-map' : false,
        module: {
            rules: [
                {
                    test: /\.txt$/i,
                    use: 'raw-loader',
                },
                {
                    test: /\.po$/i,
                    use: 'raw-loader',
                },
                {
                    test: /\.yaml$/i,
                    use: 'js-yaml-loader',
                }
            ]
        },
        resolve: {
            fallback: {
                util: require.resolve('util/')
            }
        }
    },
    pwa: {
        name: 'Stapxs QQ Lite',
        themeColor: '#606E7A',
        iconPaths: {
            faviconSVG: 'img/icons/icon.svg',
            favicon512: 'img/icons/icon.png',
            appleTouchIcon: 'img/icons/icon-for-fuck-apple.png',
            maskIcon: 'img/icons/icon-maskable.png'
        },
        manifestOptions: {
            description: '一个兼容 OneBot 的非官方网页版 QQ 客户端，使用 Vue 重制的全新版本。',
            icons: [
                {
                    'src': 'img/icons/icon.svg',
                    'sizes': '1080x1080',
                    'purpose': 'any'
                },
                {
                    'src': 'img/icons/icon.png',
                    'type': 'image/png',
                    'sizes': '512x512'
                },
                {
                    'src': 'img/icons/icon-maskable.png',
                    'sizes': '1024x1024',
                    'type': 'image/png',
                    'purpose': 'maskable'
                }
            ],
            related_applications: [
                {
                  'platform': 'play',
                  'url': 'https://play.google.com/store/apps/details?id=com.tencent.mobileqq',
                  'id': 'com.tencent.mobileqq'
                },
                {
                    'platform': 'itunes',
                    'url': 'https://apps.apple.com/app/qq/id444934666'
                }
            ]
        }     
    },
    pluginOptions: {}
}
