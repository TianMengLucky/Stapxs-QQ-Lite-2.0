<!--
 * @FileDescription: 表情面板模板
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
    <div class="ss-card face-pan">
        <BcTab>
            <div icon="fa-solid fa-face-laugh-squint">
                <div class="base-face">
                    <div v-for="num in baseFaceMax" :data-id="num"
                        v-show="getFace(num) != false"
                        :key="'base-face-' + num"
                        @click="addBaseFace(num)">
                        <img loading="lazy" :src="(getFace(num))">
                    </div>
                </div>
            </div>
            <div icon="fa-solid fa-heart">
                <div class="face-stickers" @scroll="stickersScroll">
                    <img loading="lazy" v-for="(url, index) in runtimeData.stickerCache" v-show="url != 'end'" @click="addImgFace(url)"
                        :key="'stickers-' + index" :src="url">
                    <div v-show="runtimeData.stickerCache && runtimeData.stickerCache.length <= 0" class="ss-card">
                        <font-awesome-icon :icon="['fas', 'face-dizzy']" />
                        <span>{{ $t('一无所有') }}</span>
                    </div>
                </div>
            </div>
        </BcTab>
    </div>
</template>

<script lang="ts">
import { MsgItemElem, SQCodeElem } from '@/function/elements/information'
import { defineComponent } from 'vue'
import { runtimeData } from '@/function/msg'
import { Connector } from '@/function/connect'
import { getFace } from '@/function/utils/msgUtil'

import Option from '@/function/option'

import BcTab from 'vue3-bcui/packages/bc-tab'

export default defineComponent({
    name: 'FacePan',
    props: ['display'],
    components: {
        BcTab
    },
    data() {
        return {
            getFace: getFace,
            Option: Option,
            runtimeData: runtimeData,
            baseFaceMax: 348,
            stickerPage: 1
        }
    },
    methods: {
        addSpecialMsg(json: MsgItemElem, addText: boolean) {
            this.$emit('addSpecialMsg', { addText: addText, msgObj: json } as SQCodeElem)
        },
        addBaseFace(id: number) {
            this.addSpecialMsg({ type: 'face', id: id }, true)
        },
        addImgFace(url: string) {
            this.addSpecialMsg({ type: 'image', file: url, subType: 1 }, true)
        },

        stickersScroll(e: Event) {
            const target = e.target as HTMLDivElement
            // 如果滚到了底部
            if (target.scrollHeight - target.scrollTop === target.clientHeight) {
                if(runtimeData.stickerCache) {
                    if(runtimeData.jsonMap.roaming_stamp.pagerType == 'full' &&
                        runtimeData.stickerCache[runtimeData.stickerCache.length - 1] != 'end') {
                            const count = 48 + 48 * this.stickerPage
                        // 全量分页，返回所有内容（napcat 行为）
                        Connector.send(runtimeData.jsonMap.roaming_stamp.name, 
                            { count: count }, 'getRoamingStamp_' + count)
                        this.stickerPage++
                    }
                }
            }
        }
    },
    mounted() {
        // 加载漫游表情
        if (runtimeData.stickerCache === undefined && runtimeData.jsonMap.roaming_stamp) {
            if(runtimeData.jsonMap.roaming_stamp.pagerType == 'full') {
                // 全量分页，返回所有内容（napcat 行为）
                Connector.send(runtimeData.jsonMap.roaming_stamp.name, { count: 48 }, 'getRoamingStamp_48')
            } else {
                // 默认不分页，返回所有内容（lgr 行为）
                Connector.send(runtimeData.jsonMap.roaming_stamp.name, {}, 'getRoamingStamp')
            }
        }
    }
})
</script>