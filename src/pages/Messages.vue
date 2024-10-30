<!--
 * @FileDescription: 消息列表页面
 * @Author: Stapxs
 * @Date: 
 *      2022/08/14
 *      2022/12/14
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div class="friend-view">
        <div :class="'friend-list' + (runtimeData.tags.openSideBar ? ' open' : '')" id="message-list">
            <div>
                <div class="base only">
                    <span>{{ $t('消息') }}</span>
                    <div style="flex: 1;"></div>
                    <font-awesome-icon @click="cleanList" :icon="['fas', 'trash-can']" />
                </div>
                <div class="small">
                    <span v-show="runtimeData.tags.openSideBar">{{ $t('消息') }}</span>
                    <div @click="openLeftBar">
                        <font-awesome-icon :icon="['fas', 'bars-staggered']" />
                    </div>
                </div>
            </div>
            <BcMenu :data="listMenu" @close="listMenuClose" name="messages-menu">
                <ul>
                    <li icon="fa-solid fa-thumbtack" id="top">{{ $t('置顶') }}</li>
                    <li icon="fa-solid fa-grip-lines" id="canceltop">{{ $t('取消置顶') }}</li>
                    <li icon="fa-solid fa-trash-can" id="remove">{{ $t('删除') }}</li>
                    <li icon="fa-solid fa-check-to-slot" id="readed">{{ $t('标记已读') }}</li>
                    <li icon="fa-solid fa-volume-high" id="notice_open">{{ $t('开启通知') }}</li>
                    <li icon="fa-solid fa-volume-xmark" id="notice_close">{{ $t('关闭通知') }}</li>
                </ul>
            </BcMenu>
            <div id="message-list-body" :class="(runtimeData.tags.openSideBar ? 'open' : '')" style="overflow-y: scroll;">
                <!-- 系统信息 -->
                <FriendBody key="inMessage--10000"
                    v-if="runtimeData.systemNoticesList && Object.keys(runtimeData.systemNoticesList).length > 0"
                    :select="chat.show.id === -10000"
                    :data="{ user_id: -10000, always_top: true, nickname: $t('系统通知'), remark: $t('系统通知') }"
                    @click="systemNoticeClick"></FriendBody>
                <!-- 其他消息 -->
                <FriendBody v-for="item in runtimeData.onMsgList"
                    :key="'inMessage-' + item.user_id ? item.user_id : item.group_id"
                    :select="chat.show.id === item.user_id || (chat.show.id === item.group_id && chat.group_name != '')"
                    :menu="menu.select && menu.select == item"
                    :data="item" from="message"
                    @contextmenu.prevent="listMenuShow($event, item)"
                    @click="userClick(item)"
                    @touchstart="showMenuStart($event, item)"
                    @touchend="showMenuEnd">
                </FriendBody>
            </div>
        </div>
        <div v-show="!loginInfo.status || runtimeData.chatInfo.show.id == 0" :class="'friend-list-space' + (runtimeData.tags.openSideBar ? ' open' : '')">
            <div class="ss-card">
                <font-awesome-icon :icon="['fas', 'inbox']" />
                <span>{{ $t('选择联系人开始聊天') }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import app from '@/main'
import FriendBody from '@/components/FriendBody.vue'
import BcMenu from 'vue3-bcui/packages/bc-menu'
import Menu from 'vue3-bcui/packages/bc-menu/index'
import Option from '@/function/option'

import { defineComponent } from 'vue'
import { runtimeData, notificationList } from '@/function/msg'
import { UserFriendElem, UserGroupElem } from '@/function/elements/information'
import { getRaw as getOpt, run as runOpt } from '@/function/option'
import { loadHistoryMessage } from '@/function/utils/appUtil'
import { Logger, LogType, PopInfo, PopType } from '@/function/base'
import { MenuStatue } from 'vue3-bcui/packages/dist/types'
import { library } from '@fortawesome/fontawesome-svg-core'
import { login as loginInfo } from '@/function/connect'

import { faThumbTack, faTrashCan, faCheckToSlot, faGripLines } from '@fortawesome/free-solid-svg-icons'

export default defineComponent({
    name: 'VueMessages',
    props: ['chat'],
    components: { FriendBody, BcMenu },
    data() {
        return {
            runtimeData: runtimeData,
            trRead: false,
            listMenu: {
                show: false,
                point: { x: 0, y: 0 }
            } as MenuStatue,
            menu: Menu.append,
            showMenu: false,
            loginInfo: loginInfo
        }
    },
    methods: {
        /**
         * 联系人点击事件
         * @param data 联系人对象
         */
        userClick(data: (UserFriendElem & UserGroupElem)) {
            if (!this.trRead) {
                if (this.runtimeData.tags.openSideBar) {
                    this.openLeftBar()
                }
                const index = runtimeData.onMsgList.indexOf(data)
                const back = {
                    // 临时会话标志
                    temp: data.group_name == '' ? data.group_id : undefined,
                    type: data.user_id ? 'user' : 'group',
                    id: data.user_id ? data.user_id : data.group_id,
                    name: data.group_name ? data.group_name : data.remark === data.nickname ? data.nickname : data.remark + '（' + data.nickname + '）',
                    avatar: data.user_id ? 'https://q1.qlogo.cn/g?b=qq&s=0&nk=' + data.user_id : 'https://p.qlogo.cn/gh/' + data.group_id + '/' + data.group_id + '/0'
                }
                if (this.chat.id != back.id) {
                    // 更新聊天框
                    this.$emit('userClick', back)
                    // 获取历史消息
                    this.$emit('loadHistory', back)
                    // 重置消息面板
                    // PS：这儿的作用是在运行时如果切换到了特殊面板，在点击联系人的时候可以切回来
                    if (runtimeData.sysConfig.chatview_name != '' && runtimeData.sysConfig.chatview_name != getOpt('chatview_name')) {
                        runtimeData.sysConfig.chatview_name = getOpt('chatview_name')
                        runOpt('chatview_name', getOpt('chatview_name'))
                    }
                }
                // 清除新消息标记
                runtimeData.onMsgList[index].new_msg = false
                // 清除消息通知
                const notificationIndex = notificationList.findIndex((item) => {
                    const tag = item.tag
                    const userId = Number(tag.split('/')[0])
                    return userId == data.user_id || userId == data.group_id
                })
                if (notificationIndex != -1) {
                    const notification = notificationList[notificationIndex]
                    // PS：使用 close 方法关闭通知也会触发关闭事件，所以这儿需要先移除再关闭
                    // 防止一些判断用户主动关闭通知的逻辑出现问题
                    notificationList.splice(notificationIndex, 1)
                    notification.close()
                }
            }
        },

        /**
         * 系统通知点击事件
         */
        systemNoticeClick() {
            if (this.runtimeData.tags.openSideBar) {
                this.openLeftBar()
            }
            const back = {
                type: 'user',
                id: -10000,
                name: '系统消息'
            }
            this.$emit('userClick', back)
            runtimeData.sysConfig.chatview_name = 'SystemNotice'
            runOpt('chatview_name', 'SystemNotice')
        },

        /**
         * 侧边栏操作
         */
        openLeftBar() {
            runtimeData.tags.openSideBar = !runtimeData.tags.openSideBar
        },

        /**
         *  标记群组消息为已读
         */
        readMsg(data: (UserFriendElem & UserGroupElem)) {
            const index = runtimeData.onMsgList.indexOf(data)
            runtimeData.onMsgList[index].new_msg = false
            // 标记消息已读
            const id = data.group_id ? data.group_id : data.user_id
            const type = data.group_id ? 'group' : 'user'
            loadHistoryMessage(id, type, 1, 'readMemberMessage')
            // pop
            new PopInfo().add(
                PopType.INFO, app.config.globalProperties.$t('已标记为已读'))
        },

        /**
         * 清空消息列表
         */
        cleanList() {
            // 刷新置顶列表
            const info = runtimeData.sysConfig.top_info as { [key: string]: number[] } | null
            runtimeData.onMsgList = []
            if (info != null) {
                const topList = info[runtimeData.loginInfo.uin]
                if (topList !== undefined) {
                    runtimeData.userList.forEach((item) => {
                        const id = Number(item.user_id ? item.user_id : item.group_id)
                        if (topList.indexOf(id) >= 0) {
                            item.always_top = true
                            runtimeData.onMsgList.push(item)
                        }
                    })
                }
            }
        },

        /**
         * 列表菜单关闭事件
         * @param id 选择的菜单 ID
         */
        listMenuClose(id: string) {
            const menu = document.getElementById('msg-menu-view-messages-menu')?.children[1] as HTMLDivElement
            if(menu) {
                setTimeout(() => {
                    menu.style.transition = 'transform .1s'
                }, 200)
            }
            this.listMenu.show = false
            const item = this.menu.select
            if(id) {
                switch(id) {
                    case 'readed': this.readMsg(item); break
                    case 'remove': {
                        const index = runtimeData.onMsgList.findIndex((get) => {
                            return item == get
                        })
                        runtimeData.onMsgList.splice(index, 1)
                        break
                    }
                    case 'top': this.saveTop(item, true); break
                    case 'canceltop': this.saveTop(item, false); break
                    case 'notice_open': {
                        const noticeInfo = Option.get('notice_group') ?? {}
                        const list = noticeInfo[runtimeData.loginInfo.uin]
                        if(list) {
                            list.push(item.group_id)
                        } else {
                            noticeInfo[runtimeData.loginInfo.uin] = [item.group_id]
                        }
                        Option.save('notice_group', noticeInfo)
                        break
                    }
                    case 'notice_close': {
                        const noticeInfo = Option.get('notice_group') ?? {}
                        const list = noticeInfo[runtimeData.loginInfo.uin]
                        if(list) {
                            const index = list.indexOf(item.group_id)
                            if(index >= 0) {
                                list.splice(index, 1)
                            }
                        }
                        Option.save('notice_group', noticeInfo)
                        break
                    }
                }
            }
            this.menu.select = undefined
        },

        /**
         * 判断是否通知群消息
         * @param id 群 ID
         */
        canGroupNotice(id: number) {
            const noticeInfo = Option.get('notice_group') ?? {}
            const list = noticeInfo[runtimeData.loginInfo.uin]
            if(list) {
                return list.indexOf(id) >= 0
            }
            return false
        },

        /**
         * 保存置顶信息
         * @param event 点击事件
         */
         saveTop(item: any, value: boolean) {
            const id = runtimeData.loginInfo.uin
            const upId = item.user_id ? item.user_id : item.group_id
            // 完整的设置 JSON
            let topInfo = runtimeData.sysConfig.top_info as { [key: string]: number[] }
            if (topInfo == null) {
                topInfo = {}
            }
            // 本人的置顶信息
            let topList = topInfo[id]
            // 操作
            if (value) {
                if (topList) {
                    if (topList.indexOf(this.chat.show.id) < 0) {
                        topList.push(upId)
                    }
                } else {
                    topList = [upId]
                }
            } else {
                if (topList) {
                    topList.splice(topList.indexOf(upId), 1)
                }
            }
            // 刷新设置
            if (topList) {
                topInfo[id] = topList
                Option.save('top_info', topInfo)
            }
            // 为消息列表内的对象刷新置顶标志
            item.always_top = value
            // 重新排序列表
            const newList = [] as (UserFriendElem & UserGroupElem)[]
            let topNum = 1
            runtimeData.onMsgList.forEach((item) => {
                // 排序操作
                if (item.always_top === true) {
                    newList.unshift(item)
                    topNum++
                } else if (item.new_msg === true) {
                    newList.splice(topNum - 1, 0, item)
                } else {
                    newList.push(item)
                }
            })
            runtimeData.onMsgList = newList
        },

        /**
         * 显示列表菜单
         * @param item 菜单内容
         */
        listMenuShow(event: Event, item: (UserFriendElem & UserGroupElem)) {
            const info = this.menu.set('messages-menu', event as MouseEvent)
            this.listMenuShowRun(info, item)
         },
        listMenuShowRun(info: any, item: (UserFriendElem & UserGroupElem)) {
            // PS：这是触屏触发的标志，如果优先触发了 contextmenu 就不用触发触屏了
            this.showMenu = false
            info.list = ['top', 'remove', 'readed']
            // 置顶的不显示移除
            if(item.always_top) {
                info.list = ['canceltop', 'readed']
            }
            // 是群的话显示通知设置
            if(item.group_id) {
                if(this.canGroupNotice(item.group_id)) {
                    info.list.push('notice_close')
                } else {
                    info.list.push('notice_open')
                }
            }
            this.listMenu = info
            this.menu.select = item
            // 出界处理
            setTimeout(() => {
                const menu = document.getElementById('msg-menu-view-messages-menu')?.children[1] as HTMLDivElement
                if(menu) {
                        menu.style.transition = 'margin .2s, transform .1s'
                    const hight = menu.clientHeight
                    const top = menu.getBoundingClientRect().top
                    const docHight = document.documentElement.clientHeight
                    // 出界高度
                    const dtHight = ( hight + top ) - docHight + 20
                    if(dtHight > 0) {
                        menu.style.marginTop = (docHight - hight - 30)  + 'px'
                    }

                }
            }, 100)
        },

        showMenuStart(event: TouchEvent, item: (UserFriendElem & UserGroupElem)) {
            const info = {
                show: true,
                point: {
                    x: event.targetTouches[0].pageX,
                    y: event.targetTouches[0].pageY
                }
            }
            this.showMenu = true
            setTimeout(() => {
                if(this.showMenu) {
                    this.listMenuShowRun(info, item)
                    this.showMenu = false
                }
            }, 500)
        },
        showMenuEnd() {
            this.showMenu = false
        }
    },
    mounted() {
        library.add(faCheckToSlot, faThumbTack, faTrashCan, faGripLines)
/*         if(runtimeData.tags.isElectron && runtimeData.reader) {
            this.$watch(() => runtimeData.onMsgList.length, () => {
                new Logger().add(LogType.UI, 'flush touch bar: ' + runtimeData.onMsgList.length)
                const list = [] as {
                    id: number,
                    name: string,
                    image?: string
                }[]
                runtimeData.onMsgList.forEach((item) => {
                    list.push({
                        id: item.user_id ? item.user_id : item.group_id,
                        name: item.group_name ? item.group_name : item.remark === item.nickname ? item.nickname : item.remark + '（' + item.nickname + '）',
                        image: item.user_id ? 'https://q1.qlogo.cn/g?b=qq&s=0&nk=' + item.user_id : 'https://p.qlogo.cn/gh/' + item.group_id + '/' + item.group_id + '/0'
                    })
                })
                /* runtimeData.reader?.send('sys:flushTouchBar', list)
            })
        } */
    }
})
</script>

<style>
.menu div.item > a {
    font-size: 0.9rem !important;
}
.menu div.item > svg {
    margin: 3px 10px 3px 0 !important;
    font-size: 1rem !important;
}

@media (max-width: 700px) {
    .menu {
        width: 140px !important;
    }
}
</style>
