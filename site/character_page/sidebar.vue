<template>
    <div id="character-page-sidebar" class="card bg-light">
        <div class="card-header">
            <span class="character-name">{{ character.character.name }}</span>
            <div v-if="character.character.title" class="character-title">{{ character.character.title }}</div>
            <character-action-menu :character="character"></character-action-menu>
        </div>
        <div class="card-body">
            <img :src="avatarUrl(character.character.name)" class="character-avatar" style="margin-right:10px">
            <div v-if="authenticated" class="d-flex justify-content-between flex-wrap character-links-block">
                <template v-if="character.is_self">
                    <a :href="editUrl" class="edit-link"><i class="fa fa-fw fa-pencil-alt"></i>Edit</a>
                    <a @click="showDelete" class="delete-link"><i class="fa fa-fw fa-trash"></i>Delete</a>
                    <a @click="showDuplicate" class="duplicate-link"><i class="fa fa-fw fa-copy"></i>Duplicate</a>
                </template>
                <template v-else>
                    <span v-if="character.self_staff || character.settings.prevent_bookmarks !== true">
                        <a @click.prevent="toggleBookmark" :class="{bookmarked: character.bookmarked, unbookmarked: !character.bookmarked}"
                            href="#" class="btn">
                            <i class="fa fa-fw" :class="{'fa-minus': character.bookmarked, 'fa-plus': !character.bookmarked}"></i>Bookmark
                        </a>
                        <span v-if="character.settings.prevent_bookmarks" class="prevents-bookmarks">!</span>
                    </span>
                    <a href="#" @click.prevent="showFriends" class="friend-link btn"><i class="fa fa-fw fa-user"></i>Friend</a>
                    <a href="#" v-if="!oldApi" @click.prevent="showReport" class="report-link btn">
                        <i class="fa fa-fw fa-exclamation-triangle"></i>Report</a>
                </template>
                <a href="#" @click.prevent="showMemo" class="memo-link btn"><i class="far fa-sticky-note fa-fw"></i>Memo</a>
            </div>
            <div v-if="character.badges && character.badges.length > 0" class="badges-block">
                <div v-for="badge in character.badges" class="character-badge px-2 py-1" :class="badgeClass(badge)">
                    <i class="fa-fw" :class="badgeIconClass(badge)"></i> {{ badgeTitle(badge) }}
                </div>
            </div>

            <a v-if="authenticated && !character.is_self" :href="noteUrl" class="character-page-note-link btn" style="padding:0 4px">
                <i class="far fa-envelope fa-fw"></i>Send Note</a>
            <div v-if="character.character.online_chat" @click="showInChat" class="character-page-online-chat">Online In Chat</div>

            <div class="contact-block">
                <contact-method v-for="method in contactMethods" :method="method" :key="method.id"></contact-method>
            </div>

            <div class="quick-info-block">
                <infotag-item v-for="infotag in quickInfoItems" :infotag="infotag" :key="infotag.id"></infotag-item>
                <div class="quick-info">
                    <span class="quick-info-label">Created: </span>
                    <span class="quick-info-value"><date :time="character.character.created_at"></date></span>
                </div>
                <div class="quick-info">
                    <span class="quick-info-label">Last updated: </span>
                    <span class="quick-info-value"><date :time="character.character.updated_at"></date></span>
                </div>
                <div class="quick-info" v-if="character.character.last_online_at">
                    <span class="quick-info-label">Last online:</span>
                    <span class="quick-info-value"><date :time="character.character.last_online_at"></date></span>
                </div>
                <div class="quick-info">
                    <span class="quick-info-label">Views: </span>
                    <span class="quick-info-value">{{character.character.views}}</span>
                </div>
                <div class="quick-info" v-if="character.character.timezone != null">
                    <span class="quick-info-label">Timezone:</span>
                    <span class="quick-info-value">
                    UTC{{character.character.timezone > 0 ? '+' : ''}}{{character.character.timezone != 0 ? character.character.timezone : ''}}
                </span>
                </div>
            </div>

            <div class="character-list-block">
                <div v-for="listCharacter in character.character_list">
                    <img :src="avatarUrl(listCharacter.name)" class="character-avatar icon" style="margin-right:5px">
                    <character-link :character="listCharacter.name"></character-link>
                </div>
            </div>
        </div>
        <template>
            <memo-dialog :character="character" ref="memo-dialog" @memo="memo"></memo-dialog>
            <delete-dialog :character="character" ref="delete-dialog"></delete-dialog>
            <rename-dialog :character="character" ref="rename-dialog"></rename-dialog>
            <duplicate-dialog :character="character" ref="duplicate-dialog"></duplicate-dialog>
            <report-dialog v-if="!oldApi && authenticated && !character.is_self" :character="character" ref="report-dialog"></report-dialog>
            <friend-dialog :character="character" ref="friend-dialog"></friend-dialog>
            <block-dialog :character="character" ref="block-dialog"></block-dialog>
        </template>
    </div>
</template>

<script lang="ts">
    import Vue, {Component as VueComponent, ComponentOptions, CreateElement, VNode} from 'vue';
    import Component from 'vue-class-component';
    import {Prop} from 'vue-property-decorator';
    import * as Utils from '../utils';
    import {methods, registeredComponents, Store} from './data_store';
    import {Character, CONTACT_GROUP_ID, Infotag, SharedStore} from './interfaces';

    import DateDisplay from '../../components/date_display.vue';
    import InfotagView from './infotag.vue';

    import ContactMethodView from './contact_method.vue';
    import DeleteDialog from './delete_dialog.vue';
    import DuplicateDialog from './duplicate_dialog.vue';
    import FriendDialog from './friend_dialog.vue';
    import MemoDialog from './memo_dialog.vue';
    import ReportDialog from './report_dialog.vue';

    interface ShowableVueDialog extends Vue {
        show(): void
    }

    function resolveComponent(name: string): () => Promise<VueComponent | ComponentOptions<Vue>> {
        return async(): Promise<VueComponent | ComponentOptions<Vue>> => {
            if(typeof registeredComponents[name] === 'undefined')
                return {
                    render(createElement: CreateElement): VNode {
                        return createElement('span');
                    },
                    name
                };
            return registeredComponents[name]!;
        };
    }

    Vue.component('block-dialog', resolveComponent('block-dialog'));
    Vue.component('rename-dialog', resolveComponent('rename-dialog'));
    Vue.component('character-action-menu', resolveComponent('character-action-menu'));

    @Component({
        components: {
            'contact-method': ContactMethodView,
            date: DateDisplay,
            'delete-dialog': DeleteDialog,
            'duplicate-dialog': DuplicateDialog,
            'friend-dialog': FriendDialog,
            'infotag-item': InfotagView,
            'memo-dialog': MemoDialog,
            'report-dialog': ReportDialog
        }
    })
    export default class Sidebar extends Vue {
        @Prop({required: true})
        readonly character!: Character;
        @Prop()
        readonly oldApi?: true;
        readonly shared: SharedStore = Store;
        readonly quickInfoIds: ReadonlyArray<number> = [1, 3, 2, 49, 9, 29, 15, 41, 25]; // Do not sort these.
        readonly avatarUrl = Utils.avatarURL;

        badgeClass(badgeName: string): string {
            return `character-badge-${badgeName.replace('.', '-')}`;
        }

        badgeIconClass(badgeName: string): string {
            const classMap: {[key: string]: string} = {
                admin: 'fa fa-gem',
                global: 'far fa-gem',
                chatop: 'far fa-gem',
                chanop: 'fa fa-star',
                helpdesk: 'fa fa-user',
                developer: 'fa fa-terminal',
                'subscription.lifetime': 'fa fa-certificate'
            };
            return badgeName in classMap ? classMap[badgeName] : '';
        }

        badgeTitle(badgeName: string): string {
            const badgeMap: {[key: string]: string} = {
                admin: 'Administrator',
                global: 'Global Moderator',
                chatop: 'Chat Moderator',
                chanop: 'Channel Moderator',
                helpdesk: 'Helpdesk',
                developer: 'Developer',
                'subscription.lifetime': 'Lifetime Subscriber',
                'subscription.other': 'Subscriber'
            };
            return badgeName in badgeMap ? badgeMap[badgeName] : badgeName;
        }

        showDelete(): void {
            (<ShowableVueDialog>this.$refs['delete-dialog']).show();
        }

        showDuplicate(): void {
            (<ShowableVueDialog>this.$refs['duplicate-dialog']).show();
        }

        showMemo(): void {
            (<ShowableVueDialog>this.$refs['memo-dialog']).show();
        }

        showReport(): void {
            (<ShowableVueDialog>this.$refs['report-dialog']).show();
        }

        showFriends(): void {
            (<ShowableVueDialog>this.$refs['friend-dialog']).show();
        }

        async toggleBookmark(): Promise<void> {
            const previousState = this.character.bookmarked;
            try {
                const state = !this.character.bookmarked;
                this.$emit('bookmarked', state);
                const actualState = await methods.bookmarkUpdate(this.character.character.id, state);
                this.$emit('bookmarked', actualState);
            } catch(e) {
                this.$emit('bookmarked', previousState);
                Utils.ajaxError(e, 'Unable to change bookmark state.');
            }
        }

        get editUrl(): string {
            return `${Utils.siteDomain}character/${this.character.character.id}/`;
        }

        get noteUrl(): string {
            return methods.sendNoteUrl(this.character.character);
        }

        get contactMethods(): object[] {
            const contactInfotags = Utils.groupObjectBy(Store.kinks.infotags, 'infotag_group');
            contactInfotags[CONTACT_GROUP_ID]!.sort((a: Infotag, b: Infotag) => a.name < b.name ? -1 : 1);
            const contactMethods = [];
            for(const infotag of contactInfotags[CONTACT_GROUP_ID]!) {
                const charTag = this.character.character.infotags[infotag.id];
                if(charTag === undefined) continue;
                contactMethods.push({
                    id: infotag.id,
                    value: charTag.string
                });
            }
            return contactMethods;
        }

        get quickInfoItems(): object[] {
            const quickItems = [];
            for(const id of this.quickInfoIds) {
                const infotag = this.character.character.infotags[id];
                if(infotag === undefined) continue;
                quickItems.push({
                    id,
                    string: infotag.string,
                    list: infotag.list,
                    number: infotag.number
                });
            }
            return quickItems;
        }

        get authenticated(): boolean {
            return Store.authenticated;
        }

        memo(memo: object): void {
            this.$emit('memo', memo);
        }
    }
</script>