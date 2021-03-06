import Vue, {Component, CreateElement, RenderContext, VNode} from 'vue';
import {CoreBBCodeParser} from '../bbcode/core';
//tslint:disable-next-line:match-default-export-name
import BaseEditor from '../bbcode/Editor.vue';
import {BBCodeTextTag} from '../bbcode/parser';
import ChannelView from './ChannelTagView.vue';
import {characterImage} from './common';
import core from './core';
import {Character} from './interfaces';
import UserView from './user_view';

export const BBCodeView: Component = {
    functional: true,
    render(createElement: CreateElement, context: RenderContext): VNode {
        /*tslint:disable:no-unsafe-any*///because we're not actually supposed to do any of this
        context.data.hook = {
            insert(node: VNode): void {
                node.elm!.appendChild(core.bbCodeParser.parseEverything(
                    context.props.text !== undefined ? context.props.text : context.props.unsafeText));
                if(context.props.afterInsert !== undefined) context.props.afterInsert(node.elm);
            },
            destroy(node: VNode): void {
                const element = (<BBCodeElement>(<Element>node.elm).firstChild);
                if(element.cleanup !== undefined) element.cleanup();
            }
        };
        context.data.staticClass = `bbcode${context.data.staticClass !== undefined ? ` ${context.data.staticClass}` : ''}`;
        const vnode = createElement('span', context.data);
        vnode.key = context.props.text;
        return vnode;
        //tslint:enable
    }
};

export class Editor extends BaseEditor {
    parser = core.bbCodeParser;
}

export type BBCodeElement = HTMLElement & {cleanup?(): void};

export default class BBCodeParser extends CoreBBCodeParser {
    cleanup: Vue[] = [];

    constructor() {
        super();
        this.addTag(new BBCodeTextTag('user', (parser, parent, param, content) => {
            if(param.length > 0)
                parser.warning('Unexpected parameter on user tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content)) return;
            const el = parser.createElement('span');
            parent.appendChild(el);
            const view = new UserView({el, propsData: {character: core.characters.get(content)}});
            this.cleanup.push(view);
            return el;
        }));
        this.addTag(new BBCodeTextTag('icon', (parser, parent, param, content) => {
            if(param.length > 0)
                parser.warning('Unexpected parameter on icon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content))
                return;
            const img = parser.createElement('img');
            img.src = characterImage(content);
            img.style.cursor = 'pointer';
            img.className = 'character-avatar icon';
            img.title = img.alt = content;
            (<HTMLImageElement & {character: Character}>img).character = core.characters.get(content);
            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('eicon', (parser, parent, param, content) => {
            if(param.length > 0)
                parser.warning('Unexpected parameter on eicon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content))
                return;
            const extension = core.connection.isOpen && !core.state.settings.animatedEicons ? 'png' : 'gif';
            const img = parser.createElement('img');
            img.src = `https://static.f-list.net/images/eicon/${content.toLowerCase()}.${extension}`;
            img.title = img.alt = content;
            img.className = 'character-avatar icon';
            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('session', (parser, parent, param, content) => {
            const el = parser.createElement('span');
            parent.appendChild(el);
            const view = new ChannelView({el, propsData: {id: content, text: param}});
            this.cleanup.push(view);
            return el;
        }));
        this.addTag(new BBCodeTextTag('channel', (parser, parent, _, content) => {
            const el = parser.createElement('span');
            parent.appendChild(el);
            const view = new ChannelView({el, propsData: {id: content, text: content}});
            this.cleanup.push(view);
            return el;
        }));
    }

    parseEverything(input: string): BBCodeElement {
        const elm = <BBCodeElement>super.parseEverything(input);
        if(this.cleanup.length > 0)
            elm.cleanup = ((cleanup: Vue[]) => () => {
                for(const component of cleanup) component.$destroy();
            })(this.cleanup);
        this.cleanup = [];
        return elm;
    }
}