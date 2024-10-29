<!--
 * @FileDescription: 自定义脚本相关功能
 * @Author: Stapxs
 * @Date: 2024/08/12
 * @Version: 1.0
-->

<template>
    <div class="script-view">
        <div class="list">
            <header>
                <div>
                    <span>{{ $t('脚本') }}</span>
                    <font-awesome-icon :icon="['fas', 'globe']" style="margin-right: 15px;" />
                    <font-awesome-icon @click="cnewScript" :icon="['fas', 'add']" />
                </div>
                <span>{{ $t('脚本功能提供了一种简便的自动化操作方式，能够执行如自动回复等任务。') }}</span>
            </header>
            <div class="list-body">
                <div v-for="(item, index) in savedList"
                    :id="item.title"
                    :class="{selected: (select?.title == item.title && editScript)}"
                    :key="index">
                    <div>
                        <div style="flex: 1" @click="selectItem(item)">
                            <h2>
                                {{ item.title }}
                                <span style="font-size: 0.7rem;" v-if="item.enabled">{{ $t('已启用') }}</span>
                                <span style="font-size: 0.7rem;" v-else>{{ $t('已禁用') }}</span>
                            </h2>
                            <span>
                                <font-awesome-icon v-if="item.inner" style="margin-right: 5px;" :icon="['fas', 'star']" />
                                <font-awesome-icon :icon="['fas', 'code-branch']" />
                                {{ $t('脚本类型_' + item.condition) }}{{ $t('触发') }}
                            </span>
                        </div>
                        <div :style="item.enabled ? 'color: #ed6a5e;' : ''" @click="item.enabled = !item.enabled;updateSave();">
                            <font-awesome-icon :icon="['fas', item.enabled ? 'stop' : 'play']" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="editor-main" v-if="editScript">
            <div v-if="select?.inner" class="inner">
                <font-awesome-icon :icon="['fas', 'info']" />
                <span>{{ $t('这是个内嵌示例脚本，你可以修改它并保存使用。') }}</span>
            </div>
            <div class="save-controller">
                <font-awesome-icon :icon="['fas', 'code-branch']" />
                <span>{{ $t('条件') }}</span>
                <div class="opt-item">
                    <select v-model="condition">
                        <option value="message">{{ $t('脚本类型_message') }}</option>
                        <option value="userFlush">{{ $t('脚本类型_userFlush') }}</option>
                        <option value="newNotice">{{ $t('脚本类型_newNotice') }}</option>
                    </select>
                </div>
                <div style="flex: 1;"></div>
                <button class="ss-button"
                    @click="save">
                    <font-awesome-icon :icon="['fas', 'save']" />
                    <span>{{ $t('保存') }}</span>
                </button>
                <button class="ss-button" v-if="!select?.inner"
                    @click="editScript = false;remove(select?.title);">
                    <font-awesome-icon v-if="!select" :icon="['fas', 'times']" />
                    <font-awesome-icon v-else :icon="['fas', 'trash-alt']" />
                </button>
            </div>
            <prism-editor class="editor" v-model="script"
                :highlight="highlighter" line-numbers></prism-editor>
        </div>
        <div class="editor-main notice" v-else>
            <div class="ss-card">
                <font-awesome-icon :icon="['fas', 'info-circle']" />
                <span>{{ $t('脚本方法将限制在当前页面内，你可以参考当前页面的源代码来了解可用的方法可用。') }}</span>
                <button class="ss-button" style="width: 100%; margin-top: 10px;"
                    @click="openLink('https://github.com/Stapxs/Stapxs-QQ-Lite-2.0/blob/next/src/pages/Scripts.vue')">
                    Github
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import sysScriptsList from '@/assets/scripts/_scriptList.json'

import { Connector } from '@/function/connect'
import { runtimeData } from '@/function/msg'
import { defineComponent } from 'vue'
import { openLink } from '@/function/utils/appUtil'

import { PrismEditor } from 'vue-prism-editor'
import { highlight, languages } from 'prismjs'

import { getMsgData } from '@/function/utils/msgUtil'
import { PopInfo, PopType } from '@/function/base'
import { getRaw, save } from '@/function/option'

export default defineComponent({
    name: 'ViewScripts',
    components: {
        PrismEditor
    },
    data() {
        return {
            cacheValues: {} as {[key: string]: any},
            runtimeData: runtimeData,
            openLink: openLink,
            script: '',
            condition: 'message',
            editScript: false,
            savedList: [] as {
                title: string,
                condition: string,
                script: string,
                enabled: boolean,
                inner?: boolean
            }[],
            select: undefined as {
                title: string,
                condition: string,
                script: string,
                enabled: boolean,
                inner?: boolean
            } | undefined,

            message: null as any | null,
            msgInfo: null as {[key: string]: any} | null,
            isMe: false
        }
    },
    methods: {
        /**
         * 交互操作 ==================
         */

        // 发送消息
        sendText(text: string) {
            if(this.message && this.msgInfo) {
                const id = this.msgInfo.group_id ?? this.msgInfo.private_id
                const type = this.msgInfo.group_id ? 'group' : 'private'
                let action = runtimeData.jsonMap.message_list.name_group_send ?? 'send_msg'
                if(type == 'private') {
                    action = runtimeData.jsonMap.message_list.name_user_send ?? 'send_msg'
                }
                if(type == 'group') {
                    this.sendMsg(action, {group_id: id, message: { type: 'text', data: { text: text }}})
                } else {
                    this.sendMsg(action, {user_id: id, message: { type: 'text', data: { text: text }}})
                }
            }
        },

        sendMsg(action: string, params: {[key: string]: any}) {
            Connector.send(action, params, 'ScriptBack')
        },

        /**
         * 事件处理 ==================
         */

        onEvent(type: string) {
            const scripts = this.savedList.filter((item) => item.condition == type)
            for (const script of scripts) {
                if (script.enabled) {
                    document.getElementById(script.title)?.classList.add('active')
                    setTimeout(() => {
                        document.getElementById(script.title)?.classList.remove('active')
                    }, 1500)
                    eval(script.script)
                }
            }
        },

        /**
         * 页面功能 ==================
         */

        cnewScript() {
            this.select = undefined
            this.script = '/*\n    title: Demo Script\n*/\n\nconsole.log(\'Hello World!\')'
            this.editScript = true
        },
        updateSave() {
            const saveInfo = JSON.parse(JSON.stringify(this.savedList))
            // 移除带有 inner 属性的条目，它们不需要保存
            save('scripts', JSON.stringify(saveInfo.filter((item: any) => !item.inner)))
        },
        save() {
            this.editScript = false
            // title 获取 script 第二行 title: 后的内容
            const title = this.script.split('\n')[1].split(':')[1].trim()
            if(title == '') {
                new PopInfo().add(PopType.ERR, this.$t('脚本标题已存在'))
                return
            }
            if(this.savedList.find((item) => item.title == title)) {
                // 覆盖
                this.savedList = this.savedList.map((item) => {
                    if(item.title == title) {
                        item.condition = this.condition
                        item.script = this.script
                    }
                    return item
                })
            } else {
                this.savedList.push({
                    title: title,
                    condition: this.condition,
                    script: this.script,
                    enabled: false
                })
            }
            // 如果修改的这条存在 inner 属性，那么删除 inner 属性
            this.savedList.forEach((item) => {
                if(item.title == title) {
                    delete item.inner
                }
            })
            this.updateSave()
        },
        remove(title: string | undefined) {
            if(title != undefined) {
                this.savedList = this.savedList.filter((item) => item.title != title)
                this.updateSave()
            }
        },

        selectItem(item: { title: string, condition: string, script: string, enabled: boolean }) {
            // 选中脚本
            this.select = item
            this.script = item.script
            this.condition = item.condition
            this.editScript = true
        },

        highlighter(code: any) {
            return highlight(code, languages.js, 'js')
        }
    },
    async mounted() {
        require('prismjs/themes/prism.css')
        // 加载不同暗黑模式的 css
        this.$watch(() => runtimeData.tags.darkMode, (value) => {
            if(value) {
                require('prismjs/themes/prism-tomorrow.css')
            } else {
                require('prismjs/themes/prism.css')
            }
        })
        // 读取保存的脚本
        this.savedList = /* getRaw('scripts') ? JSON.parse(decodeURIComponent(getRaw('scripts'))) :  */[]
        // 读取内嵌脚本
        for (const scriptInfo of sysScriptsList) {
            const title = scriptInfo.title
            if(this.savedList.find((item) => item.title == title)) {
                continue
            }
            // 读取 js 文件为纯文本
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const script = require('raw-loader!@/assets/scripts/' + scriptInfo.name + '.js')
            if(script.default) {
                this.savedList.unshift({
                    title: title,
                    condition: scriptInfo.condition,
                    script: script.default,
                    enabled: false,
                    inner: true
                })
            }
        }

        // 监听消息更改
        this.$watch(() => runtimeData.watch.newMsg, () => {
            if(runtimeData.sysConfig.append_scripts) {
                this.message = runtimeData.watch.newMsg
                if(this.message) {
                    // FIXME 这儿没有判断是不是自身返回的消息，注意谨防死循环
                    const infoList = getMsgData('message_info', this.message, runtimeData.jsonMap.message_info)
                    if(infoList != undefined) {
                        this.msgInfo = infoList[0]
                    }
                    if(this.msgInfo) {
                        this.isMe = Number(this.msgInfo.sender) == Number(runtimeData.loginInfo.uin)
                    } else {
                        this.isMe = false
                    }
                    this.onEvent('message')
                }
            }
        })
        // 监听新通知
        this.$watch(() => runtimeData.watch.newNotice, () => {
            this.onEvent('newNotice')
        })
        // 监听好友/群列表刷新
        this.$watch(() => runtimeData.userList.length, () => {
            this.onEvent('userFlush')
        })
    }
})
</script>

<style scoped>
.script-view {
    background: var(--color-bg);
    display: flex;
    height: 100%;
    width: 100%;
}
.list {
    width: 270px;
    display: flex;
    flex-direction: column;
}
.list > header {
    padding: 10px 10px 0 10px;
    margin: 15px 15px 10px 15px;
}
.list > header > div {
    align-items: center;
    display: flex;
}
.list > header > div > span {
    color: var(--color-font);
    font-weight: bold;
    font-size: 1rem;
    flex: 1;
}
.list > header > div > svg {
    color: var(--color-font-2);
    cursor: pointer;
}
.list > header > span {
    background: var(--color-card-2);
    color: var(--color-font-1);
    font-size: 0.9rem;
    padding: 15px;
    margin-top: 10px;
    border-radius: 7px;
    display: block;
}

.list-body {
    overflow-x: scroll;
    padding: 5px 25px;
    flex: 1;
}
.list-body::-webkit-scrollbar {
    display: none;
}
.list-body > div {
    outline: 1px solid transparent;;
    background: var(--color-card-1);
    transition: background .3s, outline .3s;
    flex-direction: column;
    margin-bottom: 10px;
    border-radius: 7px;
    cursor: pointer;
    display: flex;
    padding: 10px;
}
.list-body > div > div:last-child > div:last-child {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background: var(--color-card-2);
    border-radius: 100%;
    margin-right: 10px;
}
.list-body > div.selected > div:last-child > div:last-child {
    background: #ffffffca;
}
.list-body > div > div:last-child > div:last-child svg {
    color: var(--color-font-1);
    font-size: 0.7rem;
}
.list-body > div.selected > div:last-child > div:last-child svg {
    color: var(--color-main);
}

.list-body > div.active {
    outline: 2px solid var(--color-main);
}

.list-body > div.selected {
    background: var(--color-main);
}
.list-body > div.selected span,
.list-body > div.selected h2 {
    color: var(--color-font-r);
}
.list-body > div.selected span > svg {
    color: var(--color-font-r);
}
.list-body > div.selected svg {
    color: var(--color-font-1);
}
.list-body h2 {
    font-size: 1rem;
    margin: 0;
    color: var(--color-main);
    transition: color .3s;
}
.list-body span {
    font-size: 0.9rem;
    color: var(--color-font-2);
    transition: color .3s;
    margin-left: 5px;
}
.list-body span svg {
    font-size: 0.85rem;
    margin: 0 5px;
}
.list-body > div > div:first-child {
    display: flex;
    flex: 1;
}
.list-body > div > div:last-child {
    align-items: center;
    justify-content: space-evenly;
    margin-top: 5px;
    display: flex;
}
.list-body > div > div:last-child > svg {
    transition: color .3s;
    color: var(--color-font-1);
    margin: 5px 10px;
}

.editor-main {
    background: var(--color-card);
    padding: 20px 0;
    flex: 1;
}

.editor-main.notice > div {
    width: 50%;
    background: var(--color-card-1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
    margin-top: 50%;
    transform: translateY(-50%);
    padding: 30px;
}
.editor-main.notice > div > svg {
    font-size: 2.5rem;
    color: var(--color-main);
    margin: 20px 0;
}

.editor-main > div.inner {
    background: var(--color-card-1);
    border-radius: 7px;
    padding: 10px;
    margin: -10px 10px 10px 10px;
    font-size: 0.8rem;
    color: var(--color-font-2);
    display: flex;
    align-items: center;
}
.editor-main > div.inner > svg {
    background: var(--color-main);
    width: 0.5rem;
    color: var(--color-font-r);
    border-radius: 100%;
    padding: 4px;
    margin-right: 5px;
    font-size: 0.5rem;
}

.editor {
    color: var(--color-font-1);
    font-size: 0.9rem;
}
.editor > div:first-child {
    color: var(--color-font-1);
}

.save-controller {
    display: flex;
    padding: 15px;
    margin-top: -15px;
    align-items: center;
}
.save-controller button:first-child {
    margin-left: 0;
}
.save-controller button {
    font-size: 0.8rem;
    margin-left: 10px;
    cursor: pointer;
    min-width: 35px;
    height: 35px;
}
.save-controller button > svg {
    margin: 0 5px;
}
.save-controller button > span {
    margin: 0 5px;
}
.save-controller > span,
.save-controller > svg {
    color: var(--color-font-2);
    font-size: 0.9rem;
    margin-right: 10px;
}

.opt-item {
    padding: 0;
}
.opt-item > select {
    height: 35px;
}
.opt-item:hover {
    background: transparent;
}
</style>
