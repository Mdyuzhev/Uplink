const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-CBDRF4jg.js","./core-BGWsNGnk.js","./index-DdinnOnw.js"])))=>i.map(i=>d[i]);
import { r as reactExports, a as reactDomExports, R as React } from "./react-vendor-D36OlyLc.js";
import { b as browserIndex, g as getDefaultExportFromCjs, c as commonjsGlobal } from "./matrix-sdk-CTM_ILwH.js";
import { R as Room, T as Track, a as RoomEvent } from "./livekit-CsKhiwWQ.js";
(async ()=>{
    (function() {
        const t = document.createElement("link").relList;
        if (t && t.supports && t.supports("modulepreload")) return;
        for (const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);
        new MutationObserver((s)=>{
            for (const a of s)if (a.type === "childList") for (const o of a.addedNodes)o.tagName === "LINK" && o.rel === "modulepreload" && i(o);
        }).observe(document, {
            childList: !0,
            subtree: !0
        });
        function r(s) {
            const a = {};
            return s.integrity && (a.integrity = s.integrity), s.referrerPolicy && (a.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? a.credentials = "include" : s.crossOrigin === "anonymous" ? a.credentials = "omit" : a.credentials = "same-origin", a;
        }
        function i(s) {
            if (s.ep) return;
            s.ep = !0;
            const a = r(s);
            fetch(s.href, a);
        }
    })();
    var jsxRuntime = {
        exports: {}
    }, reactJsxRuntime_production_min = {};
    var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m$1 = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = {
        key: !0,
        ref: !0,
        __self: !0,
        __source: !0
    };
    function q(e, t, r) {
        var i, s = {}, a = null, o = null;
        r !== void 0 && (a = "" + r), t.key !== void 0 && (a = "" + t.key), t.ref !== void 0 && (o = t.ref);
        for(i in t)m$1.call(t, i) && !p.hasOwnProperty(i) && (s[i] = t[i]);
        if (e && e.defaultProps) for(i in t = e.defaultProps, t)s[i] === void 0 && (s[i] = t[i]);
        return {
            $$typeof: k,
            type: e,
            key: a,
            ref: o,
            props: s,
            _owner: n.current
        };
    }
    reactJsxRuntime_production_min.Fragment = l;
    reactJsxRuntime_production_min.jsx = q;
    reactJsxRuntime_production_min.jsxs = q;
    jsxRuntime.exports = reactJsxRuntime_production_min;
    var jsxRuntimeExports = jsxRuntime.exports, client = {}, m = reactDomExports;
    client.createRoot = m.createRoot, client.hydrateRoot = m.hydrateRoot;
    class AdminService {
        constructor(t, r){
            this.getClient = t, this.mxcToHttp = r;
        }
        async checkIsAdmin() {
            try {
                const t = this.getClient(), r = t.getUserId();
                return (await t.http.authedRequest(browserIndex.Method.Get, `/_synapse/admin/v2/users/${encodeURIComponent(r)}`, void 0, void 0, {
                    prefix: ""
                }))?.admin === !0;
            } catch  {
                return !1;
            }
        }
        async listServerUsers() {
            const t = this.getClient();
            try {
                return ((await t.http.authedRequest(browserIndex.Method.Get, "/_synapse/admin/v2/users", {
                    from: "0",
                    limit: "200",
                    guests: "false"
                }, void 0, {
                    prefix: ""
                })).users || []).map((i)=>({
                        userId: i.name,
                        displayName: i.displayname || i.name.split(":")[0].substring(1),
                        isAdmin: i.admin === 1 || i.admin === !0,
                        deactivated: i.deactivated === 1 || i.deactivated === !0,
                        avatarUrl: this.mxcToHttp(i.avatar_url, 36) || void 0
                    }));
            } catch (r) {
                throw console.error("Ошибка загрузки пользователей:", r), new Error("Нет доступа к Admin API. Вы серверный админ?");
            }
        }
        async createUser(t, r, i) {
            const s = this.getClient(), o = s.getUserId().match(/:(.+)$/)?.[1] || "uplink.local", h = `@${t.toLowerCase()}:${o}`;
            await s.http.authedRequest(browserIndex.Method.Put, `/_synapse/admin/v2/users/${encodeURIComponent(h)}`, void 0, {
                password: r,
                displayname: i || t,
                admin: !1
            }, {
                prefix: ""
            });
        }
        async setUserAdmin(t, r) {
            await this.getClient().http.authedRequest(browserIndex.Method.Put, `/_synapse/admin/v2/users/${encodeURIComponent(t)}`, void 0, {
                admin: r
            }, {
                prefix: ""
            });
        }
        async deactivateUser(t) {
            await this.getClient().http.authedRequest(browserIndex.Method.Post, `/_synapse/admin/v1/deactivate/${encodeURIComponent(t)}`, void 0, {
                erase: !1
            }, {
                prefix: ""
            });
        }
        async changePassword(t, r) {
            const i = this.getClient(), s = i.getUserId();
            await i.setPassword({
                type: "m.login.password",
                identifier: {
                    type: "m.id.user",
                    user: s
                },
                password: t
            }, r);
        }
    }
    class MediaService {
        constructor(t){
            this.getClient = t;
        }
        mxcToHttp(t, r = 96) {
            const i = this.getClient();
            if (!t) return null;
            const s = t.match(/^mxc:\/\/([^/]+)\/(.+)$/);
            if (!s) return null;
            const [, a, o] = s, h = i.getHomeserverUrl(), c = i.getAccessToken(), u = new URLSearchParams({
                width: String(r),
                height: String(r),
                method: "crop"
            });
            return c && u.set("access_token", c), `${h}/_matrix/client/v1/media/thumbnail/${a}/${o}?${u}`;
        }
        mxcToHttpDownload(t) {
            const r = this.getClient();
            if (!t) return null;
            const i = t.match(/^mxc:\/\/([^/]+)\/(.+)$/);
            if (!i) return null;
            const [, s, a] = i, o = r.getHomeserverUrl(), h = r.getAccessToken(), c = new URLSearchParams;
            return h && c.set("access_token", h), `${o}/_matrix/client/v1/media/download/${s}/${a}?${c}`;
        }
        async sendFile(t, r) {
            const i = this.getClient(), a = (await i.uploadContent(r, {
                type: r.type
            })).content_uri;
            if (r.type.startsWith("image/")) {
                const h = await this.getImageDimensions(r);
                await i.sendMessage(t, {
                    msgtype: "m.image",
                    body: r.name,
                    url: a,
                    info: {
                        mimetype: r.type,
                        size: r.size,
                        w: h.width,
                        h: h.height
                    }
                });
            } else await i.sendMessage(t, {
                msgtype: "m.file",
                body: r.name,
                url: a,
                info: {
                    mimetype: r.type,
                    size: r.size
                }
            });
        }
        getImageDimensions(t) {
            return new Promise((r)=>{
                const i = new Image;
                i.onload = ()=>{
                    r({
                        width: i.naturalWidth,
                        height: i.naturalHeight
                    }), URL.revokeObjectURL(i.src);
                }, i.onerror = ()=>{
                    r({
                        width: 0,
                        height: 0
                    }), URL.revokeObjectURL(i.src);
                }, i.src = URL.createObjectURL(t);
            });
        }
    }
    class MessageService {
        constructor(t){
            this.getClient = t;
        }
        async sendMessage(t, r) {
            await this.getClient().sendTextMessage(t, r);
        }
        async sendReply(t, r, i) {
            const s = this.getClient(), o = s.getRoom(t)?.findEventById(r), h = o?.getContent()?.body || "", c = o?.getSender() || "", u = `> <${c}> ${h}

${i}`;
            await s.sendEvent(t, "m.room.message", {
                msgtype: "m.text",
                body: u,
                format: "org.matrix.custom.html",
                formatted_body: `<mx-reply><blockquote><a href="https://matrix.to/#/${t}/${r}">In reply to</a> <a href="https://matrix.to/#/${c}">${c}</a><br>${h}</blockquote></mx-reply>${i}`,
                "m.relates_to": {
                    "m.in_reply_to": {
                        event_id: r
                    }
                }
            });
        }
        async loadMoreMessages(t, r = 30) {
            const i = this.getClient(), s = i.getRoom(t);
            if (!s) return !1;
            try {
                return await i.scrollback(s, r) !== null;
            } catch  {
                return !1;
            }
        }
        async markRoomAsRead(t) {
            const r = this.getClient(), i = r.getRoom(t);
            if (!i) return;
            const s = i.getLiveTimeline().getEvents().slice(-1)[0];
            s && await r.sendReadReceipt(s);
        }
        async sendGif(t, r) {
            await this.getClient().sendEvent(t, "m.room.message", {
                msgtype: "m.image",
                body: r.title || "GIF",
                url: r.gifUrl,
                info: {
                    mimetype: "image/gif",
                    w: r.width,
                    h: r.height
                },
                "dev.uplink.gif": !0
            });
        }
        getRoomTimeline(t) {
            const i = this.getClient().getRoom(t);
            return i ? i.getLiveTimeline().getEvents().filter((s)=>{
                const a = s.getType();
                return a === "m.room.message" || a === "m.room.encrypted" || a === "m.sticker";
            }) : [];
        }
        findEventInRoom(t, r) {
            const s = this.getClient().getRoom(t);
            if (s) return s.findEventById(r);
        }
    }
    class PinService {
        constructor(t){
            this.getClient = t;
        }
        async pinMessage(t, r) {
            const i = this.getClient(), s = i.getRoom(t);
            if (!s) return;
            const a = s.currentState.getStateEvents("m.room.pinned_events", "")?.getContent()?.pinned || [];
            a.includes(r) || await i.sendStateEvent(t, "m.room.pinned_events", {
                pinned: [
                    ...a,
                    r
                ]
            }, "");
        }
        async unpinMessage(t, r) {
            const i = this.getClient(), s = i.getRoom(t);
            if (!s) return;
            const a = s.currentState.getStateEvents("m.room.pinned_events", "")?.getContent()?.pinned || [];
            await i.sendStateEvent(t, "m.room.pinned_events", {
                pinned: a.filter((o)=>o !== r)
            }, "");
        }
        getPinnedEventIds(t) {
            const i = this.getClient().getRoom(t);
            return i ? i.currentState.getStateEvents("m.room.pinned_events", "")?.getContent()?.pinned || [] : [];
        }
    }
    class ReactionService {
        constructor(t){
            this.getClient = t;
        }
        async sendReaction(t, r, i) {
            return (await this.getClient().sendEvent(t, "m.reaction", {
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: r,
                    key: i
                }
            })).event_id;
        }
        async removeReaction(t, r) {
            await this.getClient().redactEvent(t, r);
        }
        getReactionsForRoom(t) {
            const r = new Map, s = this.getClient().getRoom(t);
            if (!s) return r;
            const a = s.getLiveTimeline().getEvents();
            for (const o of a){
                if (o.getType() !== "m.reaction" || o.isRedacted()) continue;
                const h = o.getContent()["m.relates_to"];
                if (!h || h.rel_type !== "m.annotation") continue;
                const c = h.event_id, u = h.key, v = o.getSender(), C = o.getId();
                !c || !u || !v || !C || (r.has(c) || r.set(c, []), r.get(c).push({
                    emoji: u,
                    userId: v,
                    eventId: C
                }));
            }
            return r;
        }
    }
    class ThreadService {
        constructor(t, r){
            this.getClient = t, this.getDisplayName = r;
        }
        async sendThreadMessage(t, r, i) {
            await this.getClient().sendEvent(t, "m.room.message", {
                msgtype: "m.text",
                body: i,
                "m.relates_to": {
                    rel_type: "m.thread",
                    event_id: r,
                    is_falling_back: !0,
                    "m.in_reply_to": {
                        event_id: r
                    }
                }
            });
        }
        getThreadSummary(t, r) {
            const i = this.getClient(), s = i.getRoom(t);
            if (!s) return null;
            const o = s.getThreads().find((c)=>c.id === r);
            if (!o || o.length === 0) return null;
            const h = o.replyToEvent;
            return {
                rootEventId: r,
                replyCount: o.length,
                lastReply: h ? {
                    sender: this.getDisplayName(h.getSender()),
                    body: h.getContent()?.body || "",
                    ts: h.getTs()
                } : void 0,
                participated: o.events.some((c)=>c.getSender() === i.getUserId())
            };
        }
        getThreadMessages(t, r) {
            const s = this.getClient().getRoom(t);
            if (!s) return [];
            const a = s.getThreads().find((o)=>o.id === r);
            return a ? a.events.filter((o)=>o.getType() === "m.room.message" || o.getType() === "m.room.encrypted").sort((o, h)=>o.getTs() - h.getTs()) : [];
        }
    }
    class UserService {
        constructor(t, r){
            this.getClient = t, this.mxcToHttp = r;
        }
        getServerDomain() {
            const r = (this.getClient().getUserId() || "").match(/:(.+)$/);
            return r ? r[1] : "uplink.local";
        }
        getDisplayName(t) {
            return this.getClient().getUser(t)?.displayName || t.split(":")[0].substring(1);
        }
        getPresence(t) {
            return this.getClient().getUser(t)?.presence || "offline";
        }
        async searchUsers(t = "") {
            const r = this.getClient();
            try {
                const i = t || this.getServerDomain(), s = await r.searchUserDirectory({
                    term: i,
                    limit: 50
                }), a = r.getUserId();
                return (s.results || []).filter((o)=>o.user_id !== a).map((o)=>({
                        userId: o.user_id,
                        displayName: o.display_name || o.user_id.split(":")[0].substring(1),
                        avatarUrl: this.mxcToHttp(o.avatar_url, 36) || void 0
                    }));
            } catch (i) {
                return console.error("Ошибка поиска пользователей:", i), [];
            }
        }
        getUserAvatarUrl(t, r = 36) {
            const s = this.getClient().getUser(t);
            return this.mxcToHttp(s?.avatarUrl, r);
        }
        getMyDisplayName() {
            const t = this.getClient();
            return t.getUser(t.getUserId())?.displayName || t.getUserId().split(":")[0].substring(1);
        }
        getMyAvatarUrl(t = 96) {
            const r = this.getClient(), i = r.getUser(r.getUserId());
            return this.mxcToHttp(i?.avatarUrl, t);
        }
        async fetchMyAvatarUrl(t = 96) {
            const r = this.getClient();
            try {
                const i = await r.getProfileInfo(r.getUserId());
                return this.mxcToHttp(i.avatar_url, t);
            } catch  {
                return null;
            }
        }
        async setDisplayName(t) {
            await this.getClient().setDisplayName(t);
        }
        async setAvatar(t) {
            const r = this.getClient(), i = await r.uploadContent(t, {
                type: t.type
            });
            await r.setAvatarUrl(i.content_uri);
        }
        async sendTyping(t, r) {
            await this.getClient().sendTyping(t, r, r ? 5e3 : 0);
        }
    }
    class RoomService {
        constructor(t, r, i){
            this.getClient = t, this.searchUsers = r, this.emitRoomsUpdated = i;
        }
        getServerDomain() {
            const r = (this.getClient().getUserId() || "").match(/:(.+)$/);
            return r ? r[1] : "uplink.local";
        }
        isSpace(t) {
            const i = this.getClient().getRoom(t);
            return i ? i.currentState.getStateEvents("m.room.create", "")?.getContent()?.type === "m.space" : !1;
        }
        async createSpace(t, r, i = !1) {
            const s = this.getClient(), a = [
                {
                    type: "m.room.join_rules",
                    state_key: "",
                    content: {
                        join_rule: "public"
                    }
                }
            ];
            i && a.push({
                type: "m.room.encryption",
                state_key: "",
                content: {
                    algorithm: "m.megolm.v1.aes-sha2"
                }
            });
            const o = await s.createRoom({
                name: t,
                topic: r,
                visibility: browserIndex.Visibility.Private,
                preset: browserIndex.Preset.PublicChat,
                creation_content: {
                    type: "m.space"
                },
                initial_state: a,
                power_level_content_override: {
                    events: {
                        "m.space.child": 100
                    }
                }
            });
            return await this.inviteAllUsersToRoom(o.room_id), this.emitRoomsUpdated(), o.room_id;
        }
        async createRoomInSpace(t, r, i, s = !1) {
            const a = this.getClient(), o = [
                {
                    type: "m.room.join_rules",
                    state_key: "",
                    content: {
                        join_rule: "public"
                    }
                },
                {
                    type: "m.space.parent",
                    state_key: t,
                    content: {
                        via: [
                            this.getServerDomain()
                        ],
                        canonical: !0
                    }
                }
            ];
            s && o.push({
                type: "m.room.encryption",
                state_key: "",
                content: {
                    algorithm: "m.megolm.v1.aes-sha2"
                }
            });
            const c = (await a.createRoom({
                name: r,
                topic: i,
                visibility: browserIndex.Visibility.Private,
                preset: browserIndex.Preset.PublicChat,
                initial_state: o
            })).room_id;
            return await a.sendStateEvent(t, "m.space.child", {
                via: [
                    this.getServerDomain()
                ]
            }, c), await this.inviteAllUsersToRoom(c), this.emitRoomsUpdated(), c;
        }
        async inviteAllUsersToRoom(t) {
            const r = this.getClient();
            try {
                const i = await this.searchUsers(), s = r.getUserId();
                for (const a of i)if (a.userId !== s) try {
                    await r.invite(t, a.userId);
                } catch  {}
            } catch (i) {
                console.warn("Не удалось пригласить пользователей:", i.message);
            }
        }
        findExistingDM(t) {
            const r = this.getClient(), s = (r.getAccountData("m.direct")?.getContent() || {})[t] || [], a = r.getUserId(), o = [];
            for (const u of s){
                const v = r.getRoom(u);
                if (!v || v.getMyMembership() !== "join") continue;
                const C = v.getMember(t);
                C && (C.membership === "join" || C.membership === "invite") && o.push(v);
            }
            const h = r.getRooms().filter((u)=>u.getMyMembership() === "join");
            for (const u of h){
                if (s.includes(u.roomId) || o.some((C)=>C.roomId === u.roomId)) continue;
                const v = u.getJoinedMembers();
                v.length === 2 && v.some((C)=>C.userId === t) && v.some((C)=>C.userId === a) && o.push(u);
            }
            if (o.length === 0) return null;
            const c = o.reduce((u, v)=>{
                const C = this.getLastEventTs(u);
                return this.getLastEventTs(v) > C ? v : u;
            });
            return s.includes(c.roomId) || (console.log(`Найдена DM с ${t} вне m.direct: ${c.roomId}, обновляю...`), this.updateDirectMap(t, c.roomId)), c.roomId;
        }
        getLastEventTs(t) {
            const r = t.getLiveTimeline().getEvents();
            return r.length === 0 ? 0 : r[r.length - 1].getTs();
        }
        async updateDirectMap(t, r) {
            const i = this.getClient();
            try {
                const s = i.getAccountData("m.direct")?.getContent() || {};
                s[t] || (s[t] = []), s[t].includes(r) || s[t].push(r), await i.setAccountData("m.direct", s);
            } catch (s) {
                console.warn("Не удалось обновить m.direct:", s.message);
            }
        }
        async getOrCreateDM(t, r = !1) {
            const i = this.getClient(), s = this.findExistingDM(t);
            if (s) return s;
            const a = this.findInviteFrom(t);
            if (a) return await i.joinRoom(a.roomId), await this.updateDirectMap(t, a.roomId), console.log(`Принят invite от ${t} вместо создания дубля: ${a.roomId}`), this.emitRoomsUpdated(), a.roomId;
            const o = [];
            r && o.push({
                type: "m.room.encryption",
                state_key: "",
                content: {
                    algorithm: "m.megolm.v1.aes-sha2"
                }
            });
            const c = (await i.createRoom({
                is_direct: !0,
                invite: [
                    t
                ],
                preset: browserIndex.Preset.PrivateChat,
                initial_state: o
            })).room_id;
            return await this.updateDirectMap(t, c), c;
        }
        async enableEncryption(t) {
            await this.getClient().sendStateEvent(t, "m.room.encryption", {
                algorithm: "m.megolm.v1.aes-sha2"
            }, "");
        }
        isRoomEncrypted(t) {
            const i = this.getClient().getRoom(t);
            return i ? i.hasEncryptionStateEvent() : !1;
        }
        findInviteFrom(t) {
            const r = this.getClient(), i = r.getUserId();
            for (const s of r.getRooms()){
                if (s.getMyMembership() !== "invite") continue;
                if (s.currentState.getStateEvents("m.room.member", i)?.getSender() === t) return s;
            }
            return null;
        }
    }
    const isVSCode$3 = typeof window < "u" && !!window.__VSCODE__, cache = new Map;
    function storageGet(e) {
        return isVSCode$3 ? cache.get(e) ?? null : localStorage.getItem(e);
    }
    function storageSet(e, t) {
        if (isVSCode$3) {
            cache.set(e, t), window.__UPLINK_STORAGE_BRIDGE__?.setItem(e, t);
            return;
        }
        localStorage.setItem(e, t);
    }
    function storageRemove(e) {
        if (isVSCode$3) {
            cache.delete(e), window.__UPLINK_STORAGE_BRIDGE__?.removeItem(e);
            return;
        }
        localStorage.removeItem(e);
    }
    async function initStorage() {
        if (!isVSCode$3) return;
        const e = [
            "uplink_homeserver",
            "uplink_user_id",
            "uplink_access_token",
            "uplink_device_id",
            "uplink_dm_encrypted"
        ];
        for (const t of e){
            const r = await window.__UPLINK_STORAGE_BRIDGE__.getItem(t);
            r !== null && cache.set(t, r);
        }
    }
    const STORAGE_KEYS = {
        HOMESERVER: "uplink_homeserver",
        USER_ID: "uplink_user_id",
        ACCESS_TOKEN: "uplink_access_token",
        DEVICE_ID: "uplink_device_id"
    };
    class MatrixService {
        client = null;
        _connectionState = "disconnected";
        admin;
        media;
        messages;
        pins;
        reactions;
        threads;
        users;
        rooms;
        constructor(){
            const t = ()=>this.getClient();
            this.media = new MediaService(t), this.messages = new MessageService(t), this.pins = new PinService(t), this.reactions = new ReactionService(t), this.users = new UserService(t, this.media.mxcToHttp.bind(this.media)), this.threads = new ThreadService(t, (r)=>this.users.getDisplayName(r)), this.rooms = new RoomService(t, ()=>this.users.searchUsers(""), ()=>this.emitRoomsUpdated()), this.admin = new AdminService(t, this.media.mxcToHttp.bind(this.media));
        }
        _connectionListeners = new Set;
        _roomsListeners = new Set;
        _messageListeners = new Set;
        _typingListeners = new Set;
        _threadListeners = new Set;
        get connectionState() {
            return this._connectionState;
        }
        get isConnected() {
            return this._connectionState === "connected";
        }
        onConnectionChange(t) {
            return this._connectionListeners.add(t), ()=>{
                this._connectionListeners.delete(t);
            };
        }
        onRoomsUpdated(t) {
            return this._roomsListeners.add(t), ()=>{
                this._roomsListeners.delete(t);
            };
        }
        onNewMessage(t) {
            return this._messageListeners.add(t), ()=>{
                this._messageListeners.delete(t);
            };
        }
        onTyping(t) {
            return this._typingListeners.add(t), ()=>{
                this._typingListeners.delete(t);
            };
        }
        emitConnectionChange(t) {
            this._connectionListeners.forEach((r)=>r(t));
        }
        emitRoomsUpdated() {
            this._roomsListeners.forEach((t)=>t());
        }
        emitNewMessage(t, r) {
            this._messageListeners.forEach((i)=>i(t, r));
        }
        async login(t, r, i) {
            this.setConnectionState("connecting");
            try {
                const a = await browserIndex.createClient({
                    baseUrl: t
                }).login("m.login.password", {
                    user: r,
                    password: i,
                    initial_device_display_name: "Uplink Web"
                });
                storageSet(STORAGE_KEYS.HOMESERVER, t), storageSet(STORAGE_KEYS.USER_ID, a.user_id), storageSet(STORAGE_KEYS.ACCESS_TOKEN, a.access_token), storageSet(STORAGE_KEYS.DEVICE_ID, a.device_id), await this.initClient(t, a.user_id, a.access_token, a.device_id);
            } catch (s) {
                throw this.setConnectionState("error"), s;
            }
        }
        async restoreSession() {
            const t = storageGet(STORAGE_KEYS.HOMESERVER), r = storageGet(STORAGE_KEYS.USER_ID), i = storageGet(STORAGE_KEYS.ACCESS_TOKEN), s = storageGet(STORAGE_KEYS.DEVICE_ID);
            if (!t || !r || !i || !s) return !1;
            this.setConnectionState("connecting");
            try {
                return await this.initClient(t, r, i, s), !0;
            } catch  {
                return this.clearSession(), this.setConnectionState("disconnected"), !1;
            }
        }
        async initClient(t, r, i, s) {
            this.client = browserIndex.createClient({
                baseUrl: t,
                accessToken: i,
                userId: r,
                deviceId: s
            }), await this.client.whoami();
            try {
                const a = indexedDB.open("uplink_crypto_test");
                a.onerror = ()=>{
                    console.warn("⚠️ IndexedDB недоступен (приватный режим?). E2E ключи не будут сохранены между сессиями.");
                };
            } catch  {
                console.warn("⚠️ IndexedDB недоступен");
            }
            await this.initCrypto(), this.client.on(browserIndex.ClientEvent.Sync, (a)=>{
                a === "PREPARED" ? (this.acceptPendingInvites(), this.setConnectionState("connected"), this.emitRoomsUpdated()) : a === "SYNCING" ? (this.setConnectionState("connected"), this.emitRoomsUpdated()) : (a === "ERROR" || a === "STOPPED") && this.setConnectionState("error");
            }), this.client.on(browserIndex.RoomEvent.Timeline, (a, o)=>{
                if (!o) return;
                const h = a.getType();
                (h === "m.room.message" || h === "m.room.encrypted" || h === "m.reaction" || h === "m.sticker") && (this.emitNewMessage(o.roomId, a), this.emitRoomsUpdated());
            }), this.client.on("RoomMember.typing", (a, o)=>{
                if (!this.client) return;
                const h = o.roomId, c = this.client.getRoom(h);
                if (!c) return;
                const u = this.client.getUserId(), C = c.getMembers().filter((d)=>d.typing).map((d)=>d.userId).filter((d)=>d !== u).map((d)=>this.users.getDisplayName(d));
                this._typingListeners.forEach((d)=>d(h, C));
            }), this.client.on(browserIndex.RoomEvent.MyMembership, (a, o)=>{
                o === "invite" && this.autoAcceptInvite(a), this.emitRoomsUpdated();
            }), this.client.on("RoomState.events", (a)=>{
                if (a.getType() === "m.room.pinned_events") {
                    const o = a.getRoomId();
                    o && this.emitNewMessage(o, a);
                }
            }), this.client.on("Thread.update", (a)=>{
                !a?.roomId || !a?.id || (this._threadListeners.forEach((o)=>o(a.roomId, a.id)), this.emitRoomsUpdated());
            }), this.client.on("Thread.new", (a)=>{
                !a?.roomId || !a?.id || (this._threadListeners.forEach((o)=>o(a.roomId, a.id)), this.emitRoomsUpdated());
            }), await this.client.startClient({
                initialSyncLimit: 20,
                threadSupport: !0
            });
        }
        async initCrypto() {
            if (this.client) try {
                await this.client.initRustCrypto(), console.log("✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)"), this.configureCryptoTrust();
            } catch (t) {
                console.error("❌ E2E шифрование не удалось инициализировать:", t.message), console.error("Сообщения в шифрованных комнатах не будут расшифрованы.");
            }
        }
        async acceptPendingInvites() {
            if (!this.client) return;
            const t = this.client.getRooms().filter((r)=>r.getMyMembership() === "invite");
            for (const r of t)this.autoAcceptInvite(r);
        }
        async autoAcceptInvite(t) {
            if (this.client) try {
                await this.client.joinRoom(t.roomId), console.log(`Авто-принятие invite: ${t.roomId}`);
                const r = this.client.getUserId(), i = t.currentState.getStateEvents("m.room.member", r);
                if (i?.getContent()?.is_direct === !0) {
                    const a = i?.getSender();
                    a && a !== r && (await this.rooms.updateDirectMap(a, t.roomId), console.log(`m.direct обновлён: ${a} → ${t.roomId}`));
                }
                this.emitRoomsUpdated();
            } catch (r) {
                console.warn(`Не удалось принять invite ${t.roomId}:`, r.message);
            }
        }
        configureCryptoTrust() {
            if (!this.client) return;
            const t = this.client.getCrypto();
            t && (t.globalBlacklistUnverifiedDevices = !1, console.log("PoC-режим: автодоверие устройствам включено"));
        }
        getClient() {
            if (!this.client) throw new Error("Клиент не инициализирован");
            return this.client;
        }
        getUserId() {
            return this.client?.getUserId() || "";
        }
        getRooms() {
            return this.client ? this.client.getRooms().filter((t)=>t.getMyMembership() === "join") : [];
        }
        onThreadUpdate(t) {
            return this._threadListeners.add(t), ()=>{
                this._threadListeners.delete(t);
            };
        }
        async disconnect() {
            this.client && (this.client.stopClient(), this.client.removeAllListeners(), this.client = null), this.setConnectionState("disconnected");
        }
        async logout() {
            if (this.client) try {
                await this.client.logout(!0);
            } catch  {}
            await this.disconnect(), this.clearSession();
            try {
                const t = await indexedDB.databases();
                for (const r of t)r.name && (r.name.includes("matrix") || r.name.includes("crypto")) && (indexedDB.deleteDatabase(r.name), console.log(`Удалена IndexedDB: ${r.name}`));
            } catch  {
                console.warn("Не удалось очистить IndexedDB");
            }
        }
        clearSession() {
            Object.values(STORAGE_KEYS).forEach((t)=>storageRemove(t));
        }
        setConnectionState(t) {
            this._connectionState = t, this.emitConnectionChange(t);
        }
    }
    const matrixService = new MatrixService;
    function useMatrix() {
        const [e, t] = reactExports.useState(matrixService.connectionState), [r, i] = reactExports.useState(null);
        reactExports.useEffect(()=>matrixService.onConnectionChange((h)=>{
                if (t(h), h === "connected" && i(null), window.__VSCODE__) {
                    const c = h === "connected" ? "connected" : h === "connecting" ? "connecting" : "disconnected";
                    window.__VSCODE_API__?.postMessage({
                        type: "connection-state",
                        state: c
                    });
                }
            }), []);
        const s = reactExports.useCallback(async (h, c, u)=>{
            i(null);
            try {
                await matrixService.login(h, c, u);
            } catch (v) {
                throw i(v.message || "Ошибка подключения"), v;
            }
        }, []), a = reactExports.useCallback(async ()=>{
            await matrixService.logout();
        }, []), o = reactExports.useCallback(async ()=>{
            try {
                return await matrixService.restoreSession();
            } catch  {
                return !1;
            }
        }, []);
        return {
            connectionState: e,
            error: r,
            login: s,
            logout: a,
            restoreSession: o
        };
    }
    const isTauri$2 = typeof window < "u" && !!window.__TAURI_INTERNALS__, isVSCode$2 = typeof window < "u" && !!window.__VSCODE__, isEmbedded = isTauri$2 || isVSCode$2, port = typeof window < "u" ? window.location.port : "", isDev = port === "5173", host = typeof window < "u" ? window.location.hostname : "localhost", DEFAULT_SERVER_URL = "https://uplink.wh-lab.ru";
    function getServerBaseUrl() {
        if (isDev) return `http://${host}:8008`;
        if (isEmbedded) {
            if (window.__UPLINK_SERVER_URL__) return window.__UPLINK_SERVER_URL__.replace(/\/+$/, "");
            const e = storageGet("uplink_homeserver");
            return e ? e.replace(/\/+$/, "") : DEFAULT_SERVER_URL;
        }
        return window.location.origin;
    }
    function getConfig() {
        const e = getServerBaseUrl();
        return {
            matrixHomeserver: e,
            livekitUrl: "wss://uplink-3ism3la4.livekit.cloud",
            tokenServiceUrl: isDev ? `http://${host}:7890` : `${e}/livekit-token`,
            botApiUrl: isDev ? `http://${host}:7891/api` : `${e}/bot-api`,
            botWsUrl: isDev ? `ws://${host}:7891/bot-ws` : `${e.replace(/^http/, "ws")}/bot-ws`,
            gifApiUrl: isDev ? `http://${host}:7891/api/gif` : `${e}/gif-api`
        };
    }
    const config = new Proxy({}, {
        get (e, t) {
            return getConfig()[t];
        }
    }), LoginScreen = ({ onLogin: e, error: t })=>{
        const [r, i] = reactExports.useState(config.matrixHomeserver), [s, a] = reactExports.useState(""), [o, h] = reactExports.useState(""), [c, u] = reactExports.useState(!1), v = r.trim() && s.trim() && o.trim() && !c, C = async (d)=>{
            if (d.preventDefault(), !!v) {
                u(!0);
                try {
                    await e(r.trim(), s.trim(), o);
                } catch  {} finally{
                    u(!1);
                }
            }
        };
        return jsxRuntimeExports.jsx("div", {
            className: "login-screen",
            children: jsxRuntimeExports.jsxs("form", {
                className: "login-card",
                onSubmit: C,
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "login-card__header",
                        children: [
                            jsxRuntimeExports.jsx("div", {
                                className: "login-card__logo",
                                children: "Uplink"
                            }),
                            jsxRuntimeExports.jsx("div", {
                                className: "login-card__subtitle",
                                children: "Мессенджер для разработчиков"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "login-card__field",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "login-card__label",
                                children: "Сервер"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "login-card__input",
                                type: "text",
                                value: r,
                                onChange: (d)=>i(d.target.value),
                                placeholder: "https://uplink.wh-lab.ru"
                            }),
                            isEmbedded && jsxRuntimeExports.jsx("span", {
                                className: "login-card__hint",
                                children: "Введите URL вашего Uplink-сервера"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "login-card__field",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "login-card__label",
                                children: "Пользователь"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "login-card__input",
                                type: "text",
                                value: s,
                                onChange: (d)=>a(d.target.value),
                                placeholder: "@username:uplink.local",
                                autoComplete: "username"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "login-card__field",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "login-card__label",
                                children: "Пароль"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "login-card__input",
                                type: "password",
                                value: o,
                                onChange: (d)=>h(d.target.value),
                                placeholder: "Введите пароль",
                                autoComplete: "current-password"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsx("button", {
                        className: "login-card__button",
                        type: "submit",
                        disabled: !v,
                        children: c ? "Подключение..." : "Войти"
                    }),
                    t && jsxRuntimeExports.jsxs("div", {
                        className: "login-card__error",
                        children: [
                            jsxRuntimeExports.jsx("p", {
                                children: t
                            }),
                            t.includes("шифрование") && jsxRuntimeExports.jsx("p", {
                                className: "login-card__error-hint",
                                children: "Обратитесь к администратору: крипто-модуль не установлен на сервере."
                            })
                        ]
                    })
                ]
            })
        });
    };
    function buildRoomInfo(e, t, r) {
        const i = t.getLiveTimeline().getEvents().filter((o)=>o.getType() === "m.room.message").slice(-1)[0];
        let s, a = "offline";
        if (r === "direct") {
            const h = t.getJoinedMembers().find((c)=>c.userId !== e.getUserId());
            h && (s = h.userId, a = e.getUser(h.userId)?.presence || "offline");
        }
        return {
            id: t.roomId,
            name: r === "direct" && s ? getDisplayName(e, s) : t.name || "Без названия",
            type: r,
            encrypted: t.hasEncryptionStateEvent(),
            unreadCount: t.getUnreadNotificationCount(browserIndex.NotificationCountType.Total) || 0,
            lastMessage: i?.getContent().body,
            lastMessageSender: i ? getDisplayName(e, i.getSender()) : void 0,
            lastMessageTs: i?.getTs(),
            peerId: s,
            peerPresence: a,
            topic: t.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic
        };
    }
    function getGroupedRooms(e) {
        const t = e.getRooms().filter((c)=>c.getMyMembership() === "join"), r = e.getAccountData("m.direct")?.getContent() || {}, i = new Set;
        for (const c of Object.keys(r))for (const u of r[c])i.add(u);
        const s = [], a = [], o = [], h = new Set;
        for (const c of t)c.currentState.getStateEvents("m.room.create", "")?.getContent()?.type === "m.space" && (c.currentState.getStateEvents("m.space.child").filter((d)=>Object.keys(d.getContent()).length > 0).map((d)=>d.getStateKey()).filter(Boolean).forEach((d)=>h.add(d)), s.push({
            id: c.roomId,
            name: c.name || "Без названия",
            topic: c.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic,
            rooms: []
        }));
        for (const c of t){
            if (i.has(c.roomId)) {
                o.push(buildRoomInfo(e, c, "direct"));
                continue;
            }
            if (c.currentState.getStateEvents("m.room.create", "")?.getContent()?.type === "m.space") continue;
            const v = buildRoomInfo(e, c, "channel");
            let C = !1;
            if (h.has(c.roomId)) for (const d of s){
                const S = e.getRoom(d.id);
                if (!S) continue;
                const _ = S.currentState.getStateEvents("m.space.child", c.roomId);
                if (_ && Object.keys(_.getContent()).length > 0) {
                    d.rooms.push(v), C = !0;
                    break;
                }
            }
            C || a.push(v);
        }
        return s.sort((c, u)=>c.name.localeCompare(u.name)), s.forEach((c)=>c.rooms.sort((u, v)=>u.name.localeCompare(v.name))), a.sort((c, u)=>c.name.localeCompare(u.name)), o.sort((c, u)=>(u.lastMessageTs || 0) - (c.lastMessageTs || 0)), {
            spaces: s,
            channels: a,
            directs: o
        };
    }
    function getDisplayName(e, t) {
        return e.getUser(t)?.displayName || t.split(":")[0].substring(1);
    }
    function useRooms() {
        const [e, t] = reactExports.useState([]), [r, i] = reactExports.useState([]), [s, a] = reactExports.useState([]), [o, h] = reactExports.useState(!1), c = reactExports.useCallback(()=>{
            if (matrixService.isConnected) try {
                const u = matrixService.getClient(), v = getGroupedRooms(u);
                t(v.spaces), i(v.channels), a(v.directs);
            } catch  {}
        }, []);
        return reactExports.useEffect(()=>{
            matrixService.isConnected && matrixService.admin.checkIsAdmin().then(h);
        }, []), reactExports.useEffect(()=>{
            const u = matrixService.onRoomsUpdated(c), v = matrixService.onNewMessage(()=>c());
            return c(), ()=>{
                u(), v();
            };
        }, [
            c
        ]), {
            spaces: e,
            channels: r,
            directs: s,
            isAdmin: o,
            refresh: c
        };
    }
    function parseEvent(e, t, r, i, s) {
        const a = e.getType();
        if (a !== "m.room.message" && a !== "m.room.encrypted" && a !== "m.sticker") return null;
        const o = e.getSender(), h = t(o), c = r ? r(o) : null;
        if (a === "m.room.encrypted") {
            if (e.isDecryptionFailure()) return {
                id: e.getId(),
                sender: o,
                senderDisplayName: h,
                senderAvatarUrl: c,
                timestamp: e.getTs(),
                type: "encrypted",
                body: "Не удалось расшифровать"
            };
            if (!e.getClearContent()) return {
                id: e.getId(),
                sender: o,
                senderDisplayName: h,
                senderAvatarUrl: c,
                timestamp: e.getTs(),
                type: "encrypted",
                body: "Расшифровка..."
            };
        }
        const u = e.getContent(), v = u.info || {}, C = u.url;
        let d = null, S = null, _ = null;
        C && i && s && (u.msgtype === "m.image" && (d = s(C), S = i(C, 400)), (u.msgtype === "m.file" || u.msgtype === "m.image") && (_ = s(C)));
        const T = u["m.relates_to"]?.["m.in_reply_to"];
        let x, E, y;
        T?.event_id && (x = T.event_id);
        let b = u.body || "";
        if (x && b.startsWith("> ")) {
            const w = b.indexOf(`

`);
            w !== -1 && (b = b.substring(w + 2));
        }
        if (a === "m.sticker") {
            const w = C && s ? s(C) : null;
            return {
                id: e.getId(),
                sender: o,
                senderDisplayName: h,
                senderAvatarUrl: c,
                timestamp: e.getTs(),
                type: "sticker",
                body: u.body || "Стикер",
                imageUrl: w,
                mimetype: v.mimetype,
                imageWidth: v.w || 200,
                imageHeight: v.h || 200
            };
        }
        if (u["dev.uplink.gif"]) {
            const j = C && !C.startsWith("mxc://") ? C : C && s ? s(C) : C;
            return {
                id: e.getId(),
                sender: o,
                senderDisplayName: h,
                senderAvatarUrl: c,
                timestamp: e.getTs(),
                type: "gif",
                body: u.body || "GIF",
                imageUrl: j,
                imageWidth: v.w || 300,
                imageHeight: v.h || 200,
                replyToEventId: x,
                replyToSender: E,
                replyToBody: y
            };
        }
        return u["dev.uplink.code_context"] ? {
            id: e.getId(),
            sender: o,
            senderDisplayName: h,
            senderAvatarUrl: c,
            timestamp: e.getTs(),
            type: "code",
            body: b,
            codeContext: u["dev.uplink.code_context"]
        } : {
            id: e.getId(),
            sender: o,
            senderDisplayName: h,
            senderAvatarUrl: c,
            timestamp: e.getTs(),
            type: u.msgtype === "m.image" ? "image" : u.msgtype === "m.file" ? "file" : "text",
            body: b,
            formattedBody: u.formatted_body,
            imageUrl: d,
            thumbnailUrl: S,
            fileUrl: _,
            fileSize: v.size,
            mimetype: v.mimetype,
            imageWidth: v.w,
            imageHeight: v.h,
            replyToEventId: x,
            replyToSender: E,
            replyToBody: y
        };
    }
    function useMessages(e) {
        const [t, r] = reactExports.useState([]), [i, s] = reactExports.useState(new Map), [a, o] = reactExports.useState(new Set), [h, c] = reactExports.useState(new Map), [u, v] = reactExports.useState([]), C = reactExports.useCallback(()=>{
            if (!e || !matrixService.isConnected) {
                r([]), s(new Map), o(new Set), c(new Map);
                return;
            }
            const b = matrixService.messages.getRoomTimeline(e), w = (V)=>matrixService.users.getDisplayName(V), j = (V)=>matrixService.users.getUserAvatarUrl(V), M = (V, U)=>matrixService.media.mxcToHttp(V, U), I = (V)=>matrixService.media.mxcToHttpDownload(V), B = b.filter((V)=>V.getContent()?.["m.relates_to"]?.rel_type !== "m.thread").map((V)=>parseEvent(V, w, j, M, I)).filter((V)=>V !== null);
            for (const V of B)if (V.replyToEventId && !V.replyToSender) {
                const U = matrixService.messages.findEventInRoom(e, V.replyToEventId);
                if (U) {
                    V.replyToSender = w(U.getSender());
                    let W = U.getContent()?.body || "";
                    W.length > 100 && (W = W.substring(0, 100) + "..."), V.replyToBody = W;
                }
            }
            r(B);
            const G = new Map;
            for (const V of B){
                const U = matrixService.threads.getThreadSummary(e, V.id);
                U && U.replyCount > 0 && G.set(V.id, {
                    replyCount: U.replyCount,
                    lastReply: U.lastReply
                });
            }
            c(G), s(matrixService.reactions.getReactionsForRoom(e)), o(new Set(matrixService.pins.getPinnedEventIds(e)));
        }, [
            e
        ]), d = reactExports.useMemo(()=>{
            const b = matrixService.getUserId(), w = new Map;
            for (const [j, M] of i){
                const I = new Map;
                for (const { emoji: D, userId: B, eventId: G } of M){
                    I.has(D) || I.set(D, {
                        emoji: D,
                        count: 0,
                        users: []
                    });
                    const V = I.get(D);
                    V.count++, V.users.push(matrixService.users.getDisplayName(B)), B === b && (V.myReactionEventId = G);
                }
                w.set(j, Array.from(I.values()));
            }
            return w;
        }, [
            i
        ]);
        reactExports.useEffect(()=>{
            C(), e && matrixService.messages.markRoomAsRead(e);
            const b = matrixService.onNewMessage((j)=>{
                j === e && (C(), matrixService.messages.markRoomAsRead(e));
            }), w = matrixService.onThreadUpdate((j)=>{
                j === e && C();
            });
            return ()=>{
                b(), w();
            };
        }, [
            e,
            C
        ]), reactExports.useEffect(()=>{
            if (!e) return;
            const b = matrixService.onTyping((w, j)=>{
                w === e && v(j);
            });
            return ()=>{
                b(), v([]);
            };
        }, [
            e
        ]);
        const S = reactExports.useCallback(async (b)=>{
            e && await matrixService.messages.sendMessage(e, b);
        }, [
            e
        ]), _ = reactExports.useCallback(async (b, w)=>{
            e && await matrixService.messages.sendReply(e, b, w);
        }, [
            e
        ]), g = reactExports.useCallback(async (b)=>{
            e && await matrixService.media.sendFile(e, b);
        }, [
            e
        ]), T = reactExports.useCallback(async (b, w)=>{
            e && await matrixService.reactions.sendReaction(e, b, w);
        }, [
            e
        ]), x = reactExports.useCallback(async (b)=>{
            e && await matrixService.reactions.removeReaction(e, b);
        }, [
            e
        ]), E = reactExports.useCallback(async (b)=>{
            if (e) try {
                a.has(b) ? (await matrixService.pins.unpinMessage(e, b), o((w)=>{
                    const j = new Set(w);
                    return j.delete(b), j;
                })) : (await matrixService.pins.pinMessage(e, b), o((w)=>new Set(w).add(b)));
            } catch (w) {
                console.error("Ошибка закрепления сообщения:", w);
            }
        }, [
            e,
            a
        ]), y = reactExports.useCallback(async ()=>{
            e && (await matrixService.messages.loadMoreMessages(e), C());
        }, [
            e,
            C
        ]);
        return {
            messages: t,
            reactions: d,
            pinnedIds: a,
            threadSummaries: h,
            typingUsers: u,
            sendMessage: S,
            sendReply: _,
            sendFile: g,
            sendReaction: T,
            removeReaction: x,
            togglePin: E,
            loadMore: y
        };
    }
    function useUsers() {
        const [e, t] = reactExports.useState([]), [r, i] = reactExports.useState(!1), s = reactExports.useCallback(async ()=>{
            if (matrixService.isConnected) {
                i(!0);
                try {
                    const a = await matrixService.admin.listServerUsers(), o = matrixService.getUserId();
                    t(a.filter((h)=>h.userId !== o && !h.deactivated && !h.userId.startsWith("@bot_")).map((h)=>({
                            userId: h.userId,
                            displayName: h.displayName,
                            avatarUrl: h.avatarUrl
                        })));
                } catch  {
                    try {
                        const a = await matrixService.users.searchUsers("");
                        t(a.filter((o)=>!o.userId.startsWith("@bot_")));
                    } catch (a) {
                        console.error("Ошибка загрузки пользователей:", a);
                    }
                } finally{
                    i(!1);
                }
            }
        }, []);
        return reactExports.useEffect(()=>{
            s();
        }, [
            s
        ]), {
            users: e,
            loading: r,
            loadUsers: s
        };
    }
    const scriptRel = "modulepreload", assetsURL = function(e, t) {
        return new URL(e, t).href;
    }, seen = {}, __vitePreload = function(t, r, i) {
        let s = Promise.resolve();
        if (r && r.length > 0) {
            const o = document.getElementsByTagName("link"), h = document.querySelector("meta[property=csp-nonce]"), c = h?.nonce || h?.getAttribute("nonce");
            s = Promise.allSettled(r.map((u)=>{
                if (u = assetsURL(u, i), u in seen) return;
                seen[u] = !0;
                const v = u.endsWith(".css"), C = v ? '[rel="stylesheet"]' : "";
                if (!!i) for(let _ = o.length - 1; _ >= 0; _--){
                    const g = o[_];
                    if (g.href === u && (!v || g.rel === "stylesheet")) return;
                }
                else if (document.querySelector(`link[href="${u}"]${C}`)) return;
                const S = document.createElement("link");
                if (S.rel = v ? "stylesheet" : scriptRel, v || (S.as = "script"), S.crossOrigin = "", S.href = u, c && S.setAttribute("nonce", c), document.head.appendChild(S), v) return new Promise((_, g)=>{
                    S.addEventListener("load", _), S.addEventListener("error", ()=>g(new Error(`Unable to preload CSS for ${u}`)));
                });
            }));
        }
        function a(o) {
            const h = new Event("vite:preloadError", {
                cancelable: !0
            });
            if (h.payload = o, window.dispatchEvent(h), !h.defaultPrevented) throw o;
        }
        return s.then((o)=>{
            for (const h of o || [])h.status === "rejected" && a(h.reason);
            return t().catch(a);
        });
    }, isTauri$1 = "__TAURI_INTERNALS__" in window, isVSCode$1 = !!window.__VSCODE__;
    async function showNotification(e, t, r, i) {
        if (isVSCode$1) {
            window.__VSCODE_API__?.postMessage({
                type: "notification",
                level: i?.level,
                title: e,
                body: t,
                roomId: i?.roomId,
                callId: i?.callId
            });
            return;
        }
        if (isTauri$1) try {
            const { sendNotification: s, isPermissionGranted: a, requestPermission: o } = await __vitePreload(async ()=>{
                const { sendNotification: c, isPermissionGranted: u, requestPermission: v } = await import("./index-CBDRF4jg.js");
                return {
                    sendNotification: c,
                    isPermissionGranted: u,
                    requestPermission: v
                };
            }, __vite__mapDeps([0,1]), import.meta.url);
            let h = await a();
            h || (h = await o() === "granted"), h && s({
                title: e,
                body: t
            });
        } catch (s) {
            console.warn("Tauri notification failed:", s);
        }
        else {
            if (!("Notification" in window) || Notification.permission !== "granted") return;
            const s = new Notification(e, {
                body: t,
                icon: "/uplink-icon.png",
                silent: !1
            });
            r && (s.onclick = ()=>{
                window.focus(), r(), s.close();
            }), setTimeout(()=>s.close(), 5e3);
        }
    }
    function useNotifications(e, t) {
        const r = reactExports.useRef(e);
        r.current = e;
        const i = reactExports.useRef(t);
        i.current = t, reactExports.useEffect(()=>{
            isTauri$1 || "Notification" in window && Notification.permission === "default" && Notification.requestPermission();
        }, []), reactExports.useEffect(()=>matrixService.onNewMessage((a, o)=>{
                const h = o.getSender();
                if (h === matrixService.getUserId() || a === r.current && document.hasFocus()) return;
                const c = matrixService.users.getDisplayName(h), u = o.getContent(), v = u.msgtype;
                let C;
                if (v === "m.image") C = "📷 Фото";
                else if (v === "m.file") C = "📎 Файл";
                else {
                    const T = u.body || "Новое сообщение";
                    C = T.length > 100 ? T.substring(0, 100) + "..." : T;
                }
                const d = matrixService.getUserId(), S = matrixService.users.getMyDisplayName(), _ = u.body || "", g = _.includes(d) || S && _.toLowerCase().includes(S.toLowerCase());
                showNotification(`Новое сообщение от ${c}`, C, ()=>i.current(a), {
                    level: g ? "mention" : "message",
                    roomId: a
                });
            }), []);
    }
    function useChatState() {
        const { spaces: e, channels: t, directs: r, isAdmin: i, refresh: s } = useRooms(), { users: a, loading: o } = useUsers(), [h, c] = reactExports.useState(null), [u, v] = reactExports.useState("sidebar"), [C, d] = reactExports.useState(!1), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState(null), [x, E] = reactExports.useState(!1), [y, b] = reactExports.useState(!1), [w, j] = reactExports.useState(null), [M, I] = reactExports.useState(null), [D, B] = reactExports.useState(null), { messages: G, reactions: V, pinnedIds: U, threadSummaries: W, typingUsers: z, sendMessage: A, sendReply: F, sendFile: P, sendReaction: R, removeReaction: L, togglePin: N, loadMore: $ } = useMessages(h), O = reactExports.useMemo(()=>!U || U.size === 0 ? [] : G.filter((J)=>U.has(J.id)).map((J)=>({
                    id: J.id,
                    sender: J.senderDisplayName,
                    body: J.body.length > 120 ? J.body.substring(0, 120) + "..." : J.body
                })), [
            G,
            U
        ]);
        reactExports.useEffect(()=>{
            j(null);
        }, [
            h
        ]);
        const H = reactExports.useCallback((J)=>{
            j({
                eventId: J.id,
                sender: J.senderDisplayName,
                body: J.body.length > 100 ? J.body.substring(0, 100) + "..." : J.body
            });
        }, []), Y = reactExports.useMemo(()=>[
                ...t,
                ...r,
                ...e.flatMap((J)=>J.rooms)
            ], [
            t,
            r,
            e
        ]), Z = Y.find((J)=>J.id === h) || null, ee = reactExports.useCallback((J)=>{
            c(J), B(null), v("chat"), matrixService.messages.markRoomAsRead(J).then(()=>s());
        }, [
            s
        ]), re = reactExports.useCallback((J)=>{
            h && B({
                roomId: h,
                threadRootId: J
            });
        }, [
            h
        ]), ne = reactExports.useCallback(()=>v("sidebar"), []), ie = reactExports.useCallback(async (J)=>{
            try {
                const te = storageGet("uplink_dm_encrypted") === "true", Q = await matrixService.rooms.getOrCreateDM(J, te);
                s(), c(Q), v("chat");
            } catch (te) {
                console.error("Ошибка открытия DM:", te);
            }
        }, [
            s
        ]);
        return useNotifications(h, ee), reactExports.useEffect(()=>{
            if (!window.__VSCODE__) return;
            const J = Y.reduce((te, Q)=>te + (Q.unreadCount || 0), 0);
            window.__VSCODE_API__?.postMessage({
                type: "unread-count",
                count: J
            });
        }, [
            Y
        ]), {
            spaces: e,
            channels: t,
            directs: r,
            users: a,
            usersLoading: o,
            isAdmin: i,
            refresh: s,
            activeRoomId: h,
            activeRoom: Z,
            allRooms: Y,
            messages: G,
            reactions: V,
            pinnedIds: U,
            pinnedMessages: O,
            threadSummaries: W,
            typingUsers: z,
            replyTo: w,
            scrollToEventId: M,
            activeThread: D,
            mobileView: u,
            showProfile: C,
            setShowProfile: d,
            showCreateSpace: S,
            setShowCreateSpace: _,
            createRoomForSpace: g,
            setCreateRoomForSpace: T,
            showAdminPanel: x,
            setShowAdminPanel: E,
            showBotSettings: y,
            setShowBotSettings: b,
            handleSelectRoom: ee,
            handleBack: ne,
            handleOpenDM: ie,
            handleOpenThread: re,
            handleReply: H,
            setReplyTo: j,
            setScrollToEventId: I,
            setActiveThread: B,
            sendMessage: A,
            sendReply: F,
            sendFile: P,
            sendReaction: R,
            removeReaction: L,
            togglePin: N,
            loadMore: $
        };
    }
    class LiveKitService {
        room = null;
        _callState = "idle";
        _activeRoomName = null;
        _durationTimer = null;
        _durationSeconds = 0;
        _callStateListeners = new Set;
        _participantsListeners = new Set;
        _durationListeners = new Set;
        _videoTrackListeners = new Set;
        get callState() {
            return this._callState;
        }
        get isInCall() {
            return this._callState === "connected";
        }
        get activeRoomName() {
            return this._activeRoomName;
        }
        get durationSeconds() {
            return this._durationSeconds;
        }
        onCallStateChange(t) {
            return this._callStateListeners.add(t), ()=>{
                this._callStateListeners.delete(t);
            };
        }
        onParticipantsChange(t) {
            return this._participantsListeners.add(t), ()=>{
                this._participantsListeners.delete(t);
            };
        }
        onDurationChange(t) {
            return this._durationListeners.add(t), ()=>{
                this._durationListeners.delete(t);
            };
        }
        onVideoTrack(t) {
            return this._videoTrackListeners.add(t), ()=>{
                this._videoTrackListeners.delete(t);
            };
        }
        emitCallState(t) {
            this._callState = t, this._callStateListeners.forEach((r)=>r(t));
        }
        emitParticipants() {
            const t = this.getParticipants();
            this._participantsListeners.forEach((r)=>r(t));
        }
        emitDuration(t) {
            this._durationListeners.forEach((r)=>r(t));
        }
        emitVideoTrack(t, r) {
            this._videoTrackListeners.forEach((i)=>i(t, r));
        }
        async joinCall(t, r) {
            if (this._callState === "connected" || this._callState === "connecting") {
                console.warn("Уже в звонке, сначала выйдите");
                return;
            }
            this.emitCallState("connecting"), this._activeRoomName = t;
            try {
                const i = await this.fetchToken(r, t);
                this.room = new Room({
                    adaptiveStream: !0,
                    dynacast: !0,
                    videoCaptureDefaults: {
                        resolution: {
                            width: 640,
                            height: 480,
                            frameRate: 24
                        }
                    }
                }), this.setupRoomListeners(), await this.room.connect(config.livekitUrl, i);
                try {
                    await this.room.localParticipant.setMicrophoneEnabled(!0);
                } catch (s) {
                    console.warn("Микрофон недоступен (HTTP? нет разрешения?):", s);
                }
                this.startDurationTimer(), this.emitCallState("connected"), this.emitParticipants(), console.log(`Звонок начат: ${t}`);
            } catch (i) {
                throw console.error("Ошибка подключения к звонку:", i), this.emitCallState("error"), this.cleanup(), i;
            }
        }
        async leaveCall() {
            if (this.room) {
                try {
                    this.room.disconnect(!0);
                } catch  {}
                this.cleanup(), this.emitCallState("idle"), console.log("Звонок завершён");
            }
        }
        async toggleMute() {
            if (!this.room) return !1;
            const t = this.room.localParticipant.isMicrophoneEnabled;
            return await this.room.localParticipant.setMicrophoneEnabled(!t), this.emitParticipants(), !!t;
        }
        get isMuted() {
            return this.room ? !this.room.localParticipant.isMicrophoneEnabled : !1;
        }
        async toggleCamera() {
            if (!this.room) return !1;
            const t = this.room.localParticipant.isCameraEnabled;
            try {
                await this.room.localParticipant.setCameraEnabled(!t);
            } catch (r) {
                throw console.warn("Камера недоступна (HTTP? нет разрешения?):", r), new Error("Камера недоступна. Нужен HTTPS или разрешение браузера.");
            }
            if (t) this.emitVideoTrack(this.room.localParticipant.identity, null);
            else {
                const r = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
                r?.track && this.emitVideoTrack(this.room.localParticipant.identity, r.track.mediaStreamTrack);
            }
            return this.emitParticipants(), !t;
        }
        get isCameraOn() {
            return this.room ? this.room.localParticipant.isCameraEnabled : !1;
        }
        getParticipants() {
            if (!this.room) return [];
            const t = [], r = this.room.localParticipant;
            return t.push({
                identity: r.identity,
                displayName: r.name || r.identity.split(":")[0].replace("@", ""),
                isMuted: !r.isMicrophoneEnabled,
                isSpeaking: r.isSpeaking,
                isLocal: !0,
                isCameraOn: r.isCameraEnabled
            }), this.room.remoteParticipants.forEach((i)=>{
                t.push({
                    identity: i.identity,
                    displayName: i.name || i.identity.split(":")[0].replace("@", ""),
                    isMuted: !i.isMicrophoneEnabled,
                    isSpeaking: i.isSpeaking,
                    isLocal: !1,
                    isCameraOn: i.isCameraEnabled
                });
            }), t;
        }
        async fetchToken(t, r) {
            const i = await fetch(`${config.tokenServiceUrl}/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: t,
                    roomName: r
                })
            });
            if (!i.ok) {
                const a = await i.text();
                throw new Error(`Ошибка получения токена: ${i.status} ${a}`);
            }
            return (await i.json()).token;
        }
        setupRoomListeners() {
            this.room && (this.room.on(RoomEvent.ParticipantConnected, ()=>{
                this.emitParticipants();
            }), this.room.on(RoomEvent.ParticipantDisconnected, (t)=>{
                this.emitVideoTrack(t.identity, null), this.emitParticipants();
            }), this.room.on(RoomEvent.TrackSubscribed, (t, r, i)=>{
                if (t.kind === Track.Kind.Audio) {
                    const s = t.attach();
                    s.id = `audio-${i.identity}`, document.body.appendChild(s);
                } else t.kind === Track.Kind.Video && this.emitVideoTrack(i.identity, t.mediaStreamTrack);
            }), this.room.on(RoomEvent.TrackUnsubscribed, (t, r, i)=>{
                if (t.kind === Track.Kind.Audio) {
                    t.detach().forEach((a)=>a.remove());
                    const s = document.getElementById(`audio-${i.identity}`);
                    s && s.remove();
                } else t.kind === Track.Kind.Video && this.emitVideoTrack(i.identity, null);
            }), this.room.on(RoomEvent.TrackMuted, ()=>this.emitParticipants()), this.room.on(RoomEvent.TrackUnmuted, ()=>this.emitParticipants()), this.room.on(RoomEvent.ActiveSpeakersChanged, ()=>this.emitParticipants()), this.room.on(RoomEvent.Disconnected, ()=>{
                console.log("Отключены от LiveKit"), this.cleanup(), this.emitCallState("idle");
            }), this.room.on(RoomEvent.Reconnecting, ()=>{
                console.log("Переподключение к LiveKit...");
            }), this.room.on(RoomEvent.Reconnected, ()=>{
                console.log("Переподключение к LiveKit успешно"), this.emitParticipants();
            }));
        }
        startDurationTimer() {
            this._durationSeconds = 0, this._durationTimer = setInterval(()=>{
                this._durationSeconds++, this.emitDuration(this._durationSeconds);
            }, 1e3);
        }
        cleanup() {
            this._durationTimer && (clearInterval(this._durationTimer), this._durationTimer = null), this._durationSeconds = 0, this._activeRoomName = null, this.room && (this.room.removeAllListeners(), this.room.remoteParticipants.forEach((t)=>{
                const r = document.getElementById(`audio-${t.identity}`);
                r && r.remove(), this.emitVideoTrack(t.identity, null);
            }), this.emitVideoTrack(this.room.localParticipant.identity, null), this.room = null), this.emitParticipants(), this.emitDuration(0);
        }
    }
    const livekitService = new LiveKitService;
    function useLiveKit() {
        const [e, t] = reactExports.useState(livekitService.callState), [r, i] = reactExports.useState([]), [s, a] = reactExports.useState(0), [o, h] = reactExports.useState(!1), [c, u] = reactExports.useState(!1), [v, C] = reactExports.useState(null), [d, S] = reactExports.useState(null);
        reactExports.useEffect(()=>{
            const E = livekitService.onCallStateChange((w)=>{
                t(w), C(livekitService.activeRoomName), S(w === "error" ? "Не удалось подключиться к звонку" : null), w === "idle" && u(!1);
            }), y = livekitService.onParticipantsChange((w)=>{
                i(w), h(livekitService.isMuted), u(livekitService.isCameraOn);
            }), b = livekitService.onDurationChange(a);
            return ()=>{
                E(), y(), b();
            };
        }, []);
        const _ = reactExports.useCallback(async (E)=>{
            S(null);
            try {
                const y = matrixService.getUserId();
                await livekitService.joinCall(E, y);
            } catch (y) {
                S(y.message || "Ошибка звонка");
            }
        }, []), g = reactExports.useCallback(async ()=>{
            await livekitService.leaveCall();
        }, []), T = reactExports.useCallback(async ()=>{
            await livekitService.toggleMute(), h(livekitService.isMuted);
        }, []), x = reactExports.useCallback(async ()=>{
            try {
                await livekitService.toggleCamera(), u(livekitService.isCameraOn);
            } catch (E) {
                S(E.message || "Камера недоступна");
            }
        }, []);
        return {
            callState: e,
            participants: r,
            duration: s,
            isMuted: o,
            isCameraOn: c,
            activeRoomName: v,
            error: d,
            joinCall: _,
            leaveCall: g,
            toggleMute: T,
            toggleCamera: x
        };
    }
    function generateCallId() {
        if (typeof crypto < "u" && typeof crypto.randomUUID == "function") return crypto.randomUUID();
        const e = new Uint8Array(16);
        crypto.getRandomValues(e), e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128;
        const t = Array.from(e, (r)=>r.toString(16).padStart(2, "0")).join("");
        return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
    }
    const CALL_LIFETIME_MS = 3e4;
    class CallSignalingService {
        _state = "idle";
        _currentCall = null;
        _timeoutId = null;
        _listeners = new Set;
        _listening = !1;
        _timelineHandler = null;
        get state() {
            return this._state;
        }
        get currentCall() {
            return this._currentCall;
        }
        onStateChange(t) {
            return this._listeners.add(t), ()=>{
                this._listeners.delete(t);
            };
        }
        startListening() {
            if (!this._listening) {
                this._listening = !0;
                try {
                    const t = matrixService.getClient();
                    this._timelineHandler = (r, i, s, a, o)=>{
                        try {
                            if (!o?.liveEvent) return;
                            const h = r?.getType?.();
                            if (!h || !h.startsWith("uplink.call.")) return;
                            const c = r.getContent(), u = r.getSender(), v = matrixService.getUserId();
                            if (u === v) return;
                            this.handleIncomingEvent(h, c, u, i.roomId);
                        } catch (h) {
                            console.error("CallSignaling: ошибка обработки события", h);
                        }
                    }, t.on("Room.timeline", this._timelineHandler);
                } catch (t) {
                    console.error("CallSignaling: не удалось запустить слушатель", t), this._listening = !1;
                }
            }
        }
        stopListening() {
            if (this._timelineHandler) {
                try {
                    matrixService.getClient().off("Room.timeline", this._timelineHandler);
                } catch  {}
                this._timelineHandler = null;
            }
            this._listening = !1, this.clearTimeout(), this.setState("idle", null);
        }
        async startCall(t, r) {
            if (this._state !== "idle") {
                console.warn("Уже в звонке/вызове");
                return;
            }
            const i = generateCallId(), s = matrixService.getUserId(), a = {
                callId: i,
                roomId: t,
                callerId: s,
                callerName: r,
                direction: "outgoing"
            };
            await this.sendCallEvent(t, "uplink.call.invite", {
                call_id: i,
                party_id: s,
                lifetime: CALL_LIFETIME_MS
            }), this._currentCall = a, this.setState("ringing-out", a), this._timeoutId = setTimeout(()=>{
                this._state === "ringing-out" && (this.sendCallEvent(t, "uplink.call.hangup", {
                    call_id: i,
                    party_id: s,
                    reason: "no_answer"
                }), this.setState("no-answer", a), setTimeout(()=>this.setState("idle", null), 2e3));
            }, CALL_LIFETIME_MS);
        }
        async acceptCall() {
            if (this._state !== "ringing-in" || !this._currentCall) return;
            const { callId: t, roomId: r } = this._currentCall, i = matrixService.getUserId();
            await this.sendCallEvent(r, "uplink.call.answer", {
                call_id: t,
                party_id: i
            }), this.clearTimeout(), this.setState("accepted", this._currentCall);
        }
        async rejectCall() {
            if (this._state !== "ringing-in" || !this._currentCall) return;
            const { callId: t, roomId: r } = this._currentCall, i = matrixService.getUserId();
            await this.sendCallEvent(r, "uplink.call.reject", {
                call_id: t,
                party_id: i
            }), this.clearTimeout(), this.setState("rejected", this._currentCall), setTimeout(()=>this.setState("idle", null), 2e3);
        }
        async cancelOrHangup() {
            if (!this._currentCall) return;
            const { callId: t, roomId: r } = this._currentCall, i = matrixService.getUserId();
            await this.sendCallEvent(r, "uplink.call.hangup", {
                call_id: t,
                party_id: i
            }), this.clearTimeout(), this.setState("ended", this._currentCall), setTimeout(()=>this.setState("idle", null), 1e3);
        }
        reset() {
            this.clearTimeout(), this.setState("idle", null);
        }
        handleIncomingEvent(t, r, i, s) {
            const a = r.call_id;
            if (a) switch(t){
                case "uplink.call.invite":
                    {
                        if (this._state !== "idle") {
                            this.sendCallEvent(s, "uplink.call.reject", {
                                call_id: a,
                                party_id: matrixService.getUserId(),
                                reason: "busy"
                            });
                            return;
                        }
                        const o = {
                            callId: a,
                            roomId: s,
                            callerId: i,
                            callerName: matrixService.users.getDisplayName(i),
                            direction: "incoming"
                        };
                        this._currentCall = o, this.setState("ringing-in", o), this._timeoutId = setTimeout(()=>{
                            this._state === "ringing-in" && this.setState("idle", null);
                        }, CALL_LIFETIME_MS);
                        break;
                    }
                case "uplink.call.answer":
                    {
                        this._state === "ringing-out" && this._currentCall?.callId === a && (this.clearTimeout(), this.setState("accepted", this._currentCall));
                        break;
                    }
                case "uplink.call.reject":
                    {
                        this._state === "ringing-out" && this._currentCall?.callId === a && (this.clearTimeout(), this.setState("rejected", this._currentCall), setTimeout(()=>this.setState("idle", null), 2e3));
                        break;
                    }
                case "uplink.call.hangup":
                    {
                        this._currentCall?.callId === a && (this.clearTimeout(), this.setState("ended", this._currentCall), setTimeout(()=>this.setState("idle", null), 1e3));
                        break;
                    }
            }
        }
        async sendCallEvent(t, r, i) {
            try {
                await matrixService.getClient().sendEvent(t, r, i);
            } catch (s) {
                console.error(`Ошибка отправки ${r}:`, s);
            }
        }
        setState(t, r) {
            this._state = t, this._currentCall = r, this._listeners.forEach((i)=>i(t, r)), window.__VSCODE__ && window.__VSCODE_API__?.postMessage({
                type: "call-state",
                active: t === "accepted"
            });
        }
        clearTimeout() {
            this._timeoutId && (clearTimeout(this._timeoutId), this._timeoutId = null);
        }
    }
    const callSignalingService = new CallSignalingService;
    function useCallSignaling() {
        const [e, t] = reactExports.useState(callSignalingService.state), [r, i] = reactExports.useState(callSignalingService.currentCall);
        reactExports.useEffect(()=>callSignalingService.onStateChange((v, C)=>{
                t(v), i(C);
            }), []);
        const s = reactExports.useCallback(async (u, v)=>{
            await callSignalingService.startCall(u, v);
        }, []), a = reactExports.useCallback(async ()=>{
            await callSignalingService.acceptCall();
        }, []), o = reactExports.useCallback(async ()=>{
            await callSignalingService.rejectCall();
        }, []), h = reactExports.useCallback(async ()=>{
            await callSignalingService.cancelOrHangup();
        }, []), c = reactExports.useCallback(()=>{
            callSignalingService.reset();
        }, []);
        return {
            signalState: e,
            callInfo: r,
            startCall: s,
            acceptCall: a,
            rejectCall: o,
            cancelCall: h,
            resetSignaling: c
        };
    }
    const isVSCode = !!window.__VSCODE__;
    function useVSCodeBridge(e) {
        const t = reactExports.useRef(e);
        t.current = e, reactExports.useEffect(()=>{
            if (!isVSCode) return;
            const r = (i)=>{
                const s = i.data;
                if (!(!s || !s.type)) switch(s.type){
                    case "navigate-room":
                        s.roomId && t.current.onNavigateRoom(s.roomId);
                        break;
                    case "send-snippet":
                        t.current.onSnippet(s.code, s.language, s.fileName, s.lineRange);
                        break;
                    case "file-picked":
                        t.current.onFilePicked(s.name, s.base64, s.mimeType);
                        break;
                    case "call-accept":
                        callSignalingService.acceptCall();
                        break;
                    case "call-reject":
                        callSignalingService.rejectCall();
                        break;
                    case "command":
                        s.command === "start-call" && t.current.onStartCall();
                        break;
                }
            };
            return window.addEventListener("message", r), ()=>window.removeEventListener("message", r);
        }, []);
    }
    function base64ToFile(e, t, r) {
        const i = atob(e), s = new Uint8Array(i.length);
        for(let a = 0; a < i.length; a++)s[a] = i.charCodeAt(a);
        return new File([
            s
        ], t, {
            type: r
        });
    }
    function useViewportResize() {
        reactExports.useEffect(()=>{
            if (!window.visualViewport) return;
            const e = ()=>{
                const t = window.visualViewport.height;
                document.documentElement.style.setProperty("--vh", `${t}px`);
            };
            return window.visualViewport.addEventListener("resize", e), window.visualViewport.addEventListener("scroll", e), e(), ()=>{
                window.visualViewport?.removeEventListener("resize", e), window.visualViewport?.removeEventListener("scroll", e);
            };
        }, []);
    }
    const mergeClasses = (...e)=>e.filter((t, r, i)=>!!t && t.trim() !== "" && i.indexOf(t) === r).join(" ").trim();
    const toKebabCase = (e)=>e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const toCamelCase = (e)=>e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, r, i)=>i ? i.toUpperCase() : r.toLowerCase());
    const toPascalCase = (e)=>{
        const t = toCamelCase(e);
        return t.charAt(0).toUpperCase() + t.slice(1);
    };
    var defaultAttributes = {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round"
    };
    const hasA11yProp = (e)=>{
        for(const t in e)if (t.startsWith("aria-") || t === "role" || t === "title") return !0;
        return !1;
    };
    const Icon = reactExports.forwardRef(({ color: e = "currentColor", size: t = 24, strokeWidth: r = 2, absoluteStrokeWidth: i, className: s = "", children: a, iconNode: o, ...h }, c)=>reactExports.createElement("svg", {
            ref: c,
            ...defaultAttributes,
            width: t,
            height: t,
            stroke: e,
            strokeWidth: i ? Number(r) * 24 / Number(t) : r,
            className: mergeClasses("lucide", s),
            ...!a && !hasA11yProp(h) && {
                "aria-hidden": "true"
            },
            ...h
        }, [
            ...o.map(([u, v])=>reactExports.createElement(u, v)),
            ...Array.isArray(a) ? a : [
                a
            ]
        ]));
    const createLucideIcon = (e, t)=>{
        const r = reactExports.forwardRef(({ className: i, ...s }, a)=>reactExports.createElement(Icon, {
                ref: a,
                iconNode: t,
                className: mergeClasses(`lucide-${toKebabCase(toPascalCase(e))}`, `lucide-${e}`, i),
                ...s
            }));
        return r.displayName = toPascalCase(e), r;
    };
    const __iconNode$v = [
        [
            "path",
            {
                d: "m12 19-7-7 7-7",
                key: "1l729n"
            }
        ],
        [
            "path",
            {
                d: "M19 12H5",
                key: "x3x0zl"
            }
        ]
    ], ArrowLeft = createLucideIcon("arrow-left", __iconNode$v);
    const __iconNode$u = [
        [
            "path",
            {
                d: "M12 8V4H8",
                key: "hb8ula"
            }
        ],
        [
            "rect",
            {
                width: "16",
                height: "12",
                x: "4",
                y: "8",
                rx: "2",
                key: "enze0r"
            }
        ],
        [
            "path",
            {
                d: "M2 14h2",
                key: "vft8re"
            }
        ],
        [
            "path",
            {
                d: "M20 14h2",
                key: "4cs60a"
            }
        ],
        [
            "path",
            {
                d: "M15 13v2",
                key: "1xurst"
            }
        ],
        [
            "path",
            {
                d: "M9 13v2",
                key: "rq6x2g"
            }
        ]
    ], Bot = createLucideIcon("bot", __iconNode$u);
    const __iconNode$t = [
        [
            "path",
            {
                d: "m6 9 6 6 6-6",
                key: "qrunsl"
            }
        ]
    ], ChevronDown = createLucideIcon("chevron-down", __iconNode$t);
    const __iconNode$s = [
        [
            "path",
            {
                d: "m9 18 6-6-6-6",
                key: "mthhwq"
            }
        ]
    ], ChevronRight = createLucideIcon("chevron-right", __iconNode$s);
    const __iconNode$r = [
        [
            "circle",
            {
                cx: "12",
                cy: "12",
                r: "10",
                key: "1mglay"
            }
        ],
        [
            "path",
            {
                d: "M12 6v6l4 2",
                key: "mmk7yg"
            }
        ]
    ], Clock = createLucideIcon("clock", __iconNode$r);
    const __iconNode$q = [
        [
            "path",
            {
                d: "M12 15V3",
                key: "m9g1x1"
            }
        ],
        [
            "path",
            {
                d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
                key: "ih7n3h"
            }
        ],
        [
            "path",
            {
                d: "m7 10 5 5 5-5",
                key: "brsn70"
            }
        ]
    ], Download = createLucideIcon("download", __iconNode$q);
    const __iconNode$p = [
        [
            "path",
            {
                d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
                key: "1oefj6"
            }
        ],
        [
            "path",
            {
                d: "M14 2v5a1 1 0 0 0 1 1h5",
                key: "wfsgrz"
            }
        ],
        [
            "path",
            {
                d: "M10 9H8",
                key: "b1mrlr"
            }
        ],
        [
            "path",
            {
                d: "M16 13H8",
                key: "t4e002"
            }
        ],
        [
            "path",
            {
                d: "M16 17H8",
                key: "z1uh3a"
            }
        ]
    ], FileText = createLucideIcon("file-text", __iconNode$p);
    const __iconNode$o = [
        [
            "rect",
            {
                width: "18",
                height: "18",
                x: "3",
                y: "3",
                rx: "2",
                ry: "2",
                key: "1m3agn"
            }
        ],
        [
            "circle",
            {
                cx: "9",
                cy: "9",
                r: "2",
                key: "af1f0g"
            }
        ],
        [
            "path",
            {
                d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
                key: "1xmnt7"
            }
        ]
    ], Image$1 = createLucideIcon("image", __iconNode$o);
    const __iconNode$n = [
        [
            "rect",
            {
                width: "18",
                height: "11",
                x: "3",
                y: "11",
                rx: "2",
                ry: "2",
                key: "1w4ew1"
            }
        ],
        [
            "path",
            {
                d: "M7 11V7a5 5 0 0 1 9.9-1",
                key: "1mm8w8"
            }
        ]
    ], LockOpen = createLucideIcon("lock-open", __iconNode$n);
    const __iconNode$m = [
        [
            "rect",
            {
                width: "18",
                height: "11",
                x: "3",
                y: "11",
                rx: "2",
                ry: "2",
                key: "1w4ew1"
            }
        ],
        [
            "path",
            {
                d: "M7 11V7a5 5 0 0 1 10 0v4",
                key: "fwvmzm"
            }
        ]
    ], Lock = createLucideIcon("lock", __iconNode$m);
    const __iconNode$l = [
        [
            "path",
            {
                d: "m16 17 5-5-5-5",
                key: "1bji2h"
            }
        ],
        [
            "path",
            {
                d: "M21 12H9",
                key: "dn1m92"
            }
        ],
        [
            "path",
            {
                d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
                key: "1uf3rs"
            }
        ]
    ], LogOut = createLucideIcon("log-out", __iconNode$l);
    const __iconNode$k = [
        [
            "path",
            {
                d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
                key: "18887p"
            }
        ]
    ], MessageSquare = createLucideIcon("message-square", __iconNode$k);
    const __iconNode$j = [
        [
            "path",
            {
                d: "M12 19v3",
                key: "npa21l"
            }
        ],
        [
            "path",
            {
                d: "M15 9.34V5a3 3 0 0 0-5.68-1.33",
                key: "1gzdoj"
            }
        ],
        [
            "path",
            {
                d: "M16.95 16.95A7 7 0 0 1 5 12v-2",
                key: "cqa7eg"
            }
        ],
        [
            "path",
            {
                d: "M18.89 13.23A7 7 0 0 0 19 12v-2",
                key: "16hl24"
            }
        ],
        [
            "path",
            {
                d: "m2 2 20 20",
                key: "1ooewy"
            }
        ],
        [
            "path",
            {
                d: "M9 9v3a3 3 0 0 0 5.12 2.12",
                key: "r2i35w"
            }
        ]
    ], MicOff = createLucideIcon("mic-off", __iconNode$j);
    const __iconNode$i = [
        [
            "path",
            {
                d: "M12 19v3",
                key: "npa21l"
            }
        ],
        [
            "path",
            {
                d: "M19 10v2a7 7 0 0 1-14 0v-2",
                key: "1vc78b"
            }
        ],
        [
            "rect",
            {
                x: "9",
                y: "2",
                width: "6",
                height: "13",
                rx: "3",
                key: "s6n7sd"
            }
        ]
    ], Mic = createLucideIcon("mic", __iconNode$i);
    const __iconNode$h = [
        [
            "path",
            {
                d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
                key: "1miecu"
            }
        ]
    ], Paperclip = createLucideIcon("paperclip", __iconNode$h);
    const __iconNode$g = [
        [
            "path",
            {
                d: "M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272",
                key: "1wngk7"
            }
        ],
        [
            "path",
            {
                d: "M22 2 2 22",
                key: "y4kqgn"
            }
        ],
        [
            "path",
            {
                d: "M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473",
                key: "10hv5p"
            }
        ]
    ], PhoneOff = createLucideIcon("phone-off", __iconNode$g);
    const __iconNode$f = [
        [
            "path",
            {
                d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
                key: "9njp5v"
            }
        ]
    ], Phone = createLucideIcon("phone", __iconNode$f);
    const __iconNode$e = [
        [
            "path",
            {
                d: "M12 17v5",
                key: "bb1du9"
            }
        ],
        [
            "path",
            {
                d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
                key: "1nkz8b"
            }
        ]
    ], Pin = createLucideIcon("pin", __iconNode$e);
    const __iconNode$d = [
        [
            "path",
            {
                d: "M5 12h14",
                key: "1ays0h"
            }
        ],
        [
            "path",
            {
                d: "M12 5v14",
                key: "s699le"
            }
        ]
    ], Plus = createLucideIcon("plus", __iconNode$d);
    const __iconNode$c = [
        [
            "path",
            {
                d: "M20 18v-2a4 4 0 0 0-4-4H4",
                key: "5vmcpk"
            }
        ],
        [
            "path",
            {
                d: "m9 17-5-5 5-5",
                key: "nvlc11"
            }
        ]
    ], Reply = createLucideIcon("reply", __iconNode$c);
    const __iconNode$b = [
        [
            "path",
            {
                d: "m21 21-4.34-4.34",
                key: "14j7rj"
            }
        ],
        [
            "circle",
            {
                cx: "11",
                cy: "11",
                r: "8",
                key: "4ej97u"
            }
        ]
    ], Search = createLucideIcon("search", __iconNode$b);
    const __iconNode$a = [
        [
            "path",
            {
                d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
                key: "1ffxy3"
            }
        ],
        [
            "path",
            {
                d: "m21.854 2.147-10.94 10.939",
                key: "12cjpa"
            }
        ]
    ], Send = createLucideIcon("send", __iconNode$a);
    const __iconNode$9 = [
        [
            "path",
            {
                d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
                key: "1i5ecw"
            }
        ],
        [
            "circle",
            {
                cx: "12",
                cy: "12",
                r: "3",
                key: "1v7zrd"
            }
        ]
    ], Settings = createLucideIcon("settings", __iconNode$9);
    const __iconNode$8 = [
        [
            "path",
            {
                d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
                key: "oel41y"
            }
        ],
        [
            "path",
            {
                d: "m9 12 2 2 4-4",
                key: "dzmm74"
            }
        ]
    ], ShieldCheck = createLucideIcon("shield-check", __iconNode$8);
    const __iconNode$7 = [
        [
            "path",
            {
                d: "m2 2 20 20",
                key: "1ooewy"
            }
        ],
        [
            "path",
            {
                d: "M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71",
                key: "1jlk70"
            }
        ],
        [
            "path",
            {
                d: "M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264",
                key: "18rp1v"
            }
        ]
    ], ShieldOff = createLucideIcon("shield-off", __iconNode$7);
    const __iconNode$6 = [
        [
            "path",
            {
                d: "M22 11v1a10 10 0 1 1-9-10",
                key: "ew0xw9"
            }
        ],
        [
            "path",
            {
                d: "M8 14s1.5 2 4 2 4-2 4-2",
                key: "1y1vjs"
            }
        ],
        [
            "line",
            {
                x1: "9",
                x2: "9.01",
                y1: "9",
                y2: "9",
                key: "yxxnd0"
            }
        ],
        [
            "line",
            {
                x1: "15",
                x2: "15.01",
                y1: "9",
                y2: "9",
                key: "1p4y9e"
            }
        ],
        [
            "path",
            {
                d: "M16 5h6",
                key: "1vod17"
            }
        ],
        [
            "path",
            {
                d: "M19 2v6",
                key: "4bpg5p"
            }
        ]
    ], SmilePlus = createLucideIcon("smile-plus", __iconNode$6);
    const __iconNode$5 = [
        [
            "circle",
            {
                cx: "12",
                cy: "12",
                r: "10",
                key: "1mglay"
            }
        ],
        [
            "path",
            {
                d: "M8 14s1.5 2 4 2 4-2 4-2",
                key: "1y1vjs"
            }
        ],
        [
            "line",
            {
                x1: "9",
                x2: "9.01",
                y1: "9",
                y2: "9",
                key: "yxxnd0"
            }
        ],
        [
            "line",
            {
                x1: "15",
                x2: "15.01",
                y1: "9",
                y2: "9",
                key: "1p4y9e"
            }
        ]
    ], Smile = createLucideIcon("smile", __iconNode$5);
    const __iconNode$4 = [
        [
            "path",
            {
                d: "M10 11v6",
                key: "nco0om"
            }
        ],
        [
            "path",
            {
                d: "M14 11v6",
                key: "outv1u"
            }
        ],
        [
            "path",
            {
                d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
                key: "miytrc"
            }
        ],
        [
            "path",
            {
                d: "M3 6h18",
                key: "d0wm0j"
            }
        ],
        [
            "path",
            {
                d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                key: "e791ji"
            }
        ]
    ], Trash2 = createLucideIcon("trash-2", __iconNode$4);
    const __iconNode$3 = [
        [
            "path",
            {
                d: "M12 3v12",
                key: "1x0j5s"
            }
        ],
        [
            "path",
            {
                d: "m17 8-5-5-5 5",
                key: "7q97r8"
            }
        ],
        [
            "path",
            {
                d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
                key: "ih7n3h"
            }
        ]
    ], Upload = createLucideIcon("upload", __iconNode$3);
    const __iconNode$2 = [
        [
            "path",
            {
                d: "M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196",
                key: "w8jjjt"
            }
        ],
        [
            "path",
            {
                d: "M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2",
                key: "1xawa7"
            }
        ],
        [
            "path",
            {
                d: "m2 2 20 20",
                key: "1ooewy"
            }
        ]
    ], VideoOff = createLucideIcon("video-off", __iconNode$2);
    const __iconNode$1 = [
        [
            "path",
            {
                d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
                key: "ftymec"
            }
        ],
        [
            "rect",
            {
                x: "2",
                y: "6",
                width: "14",
                height: "12",
                rx: "2",
                key: "158x01"
            }
        ]
    ], Video = createLucideIcon("video", __iconNode$1);
    const __iconNode = [
        [
            "path",
            {
                d: "M18 6 6 18",
                key: "1bl5f8"
            }
        ],
        [
            "path",
            {
                d: "m6 6 12 12",
                key: "d8bk6v"
            }
        ]
    ], X = createLucideIcon("x", __iconNode), RoomItem = ({ room: e, active: t, onClick: r, indent: i })=>jsxRuntimeExports.jsxs("div", {
            className: `sidebar-room-item ${t ? "sidebar-room-item--active" : ""} ${i ? "sidebar-room-item--indent" : ""}`,
            onClick: r,
            children: [
                jsxRuntimeExports.jsx("span", {
                    className: "sidebar-room-item__icon",
                    children: e.type === "channel" ? "#" : jsxRuntimeExports.jsx("span", {
                        className: `presence-dot presence-dot--${e.peerPresence || "offline"}`
                    })
                }),
                jsxRuntimeExports.jsx("span", {
                    className: "sidebar-room-item__name",
                    children: e.name
                }),
                e.unreadCount > 0 && jsxRuntimeExports.jsx("span", {
                    className: "sidebar-room-item__badge",
                    children: e.unreadCount
                })
            ]
        }), SpaceItem = ({ space: e, activeRoomId: t, isAdmin: r, onSelectRoom: i, onCreateRoom: s })=>{
        const [a, o] = reactExports.useState(!1);
        return jsxRuntimeExports.jsxs("div", {
            className: "sidebar-space",
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "sidebar-space__header",
                    onClick: ()=>o(!a),
                    children: [
                        jsxRuntimeExports.jsx("span", {
                            className: `sidebar-space__arrow ${a ? "sidebar-space__arrow--collapsed" : ""}`,
                            children: jsxRuntimeExports.jsx(ChevronDown, {
                                size: 14
                            })
                        }),
                        jsxRuntimeExports.jsx("span", {
                            className: "sidebar-space__name",
                            children: e.name
                        }),
                        r && jsxRuntimeExports.jsx("button", {
                            className: "sidebar-space__add-btn",
                            onClick: (h)=>{
                                h.stopPropagation(), s(e.id);
                            },
                            title: "Создать комнату",
                            children: jsxRuntimeExports.jsx(Plus, {
                                size: 14
                            })
                        })
                    ]
                }),
                !a && e.rooms.map((h)=>jsxRuntimeExports.jsx(RoomItem, {
                        room: h,
                        active: h.id === t,
                        onClick: ()=>i(h.id),
                        indent: !0
                    }, h.id)),
                !a && e.rooms.length === 0 && jsxRuntimeExports.jsx("div", {
                    className: "sidebar-space__empty",
                    children: "Нет комнат"
                })
            ]
        });
    }, COLORS = [
        "#e74c3c",
        "#e67e22",
        "#f1c40f",
        "#2ecc71",
        "#1abc9c",
        "#3498db",
        "#9b59b6",
        "#e84393",
        "#00b894",
        "#6c5ce7"
    ];
    function hashColor(e) {
        let t = 0;
        for(let r = 0; r < e.length; r++)t = e.charCodeAt(r) + ((t << 5) - t);
        return COLORS[Math.abs(t) % COLORS.length];
    }
    const Avatar = ({ name: e, size: t = 36, online: r, imageUrl: i, userId: s })=>{
        const a = (e[0] || "?").toUpperCase(), o = hashColor(e), h = s?.startsWith("@bot_");
        return jsxRuntimeExports.jsxs("div", {
            className: "avatar",
            style: {
                width: t,
                height: t,
                fontSize: t * .4,
                background: i ? "transparent" : o
            },
            children: [
                i ? jsxRuntimeExports.jsx("img", {
                    src: i,
                    alt: e,
                    style: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%"
                    }
                }) : a,
                r && jsxRuntimeExports.jsx("span", {
                    className: "avatar__online-dot"
                }),
                h && jsxRuntimeExports.jsx("span", {
                    className: "avatar__bot-indicator",
                    title: "Бот",
                    children: jsxRuntimeExports.jsx(Bot, {
                        size: 10
                    })
                })
            ]
        });
    }, UserItem = ({ user: e, onClick: t })=>jsxRuntimeExports.jsxs("div", {
            className: "sidebar-room-item sidebar-user-item",
            onClick: t,
            children: [
                jsxRuntimeExports.jsx("span", {
                    className: "sidebar-room-item__icon",
                    children: jsxRuntimeExports.jsx(Avatar, {
                        name: e.displayName,
                        size: 20,
                        imageUrl: e.avatarUrl
                    })
                }),
                jsxRuntimeExports.jsx("span", {
                    className: "sidebar-room-item__name",
                    children: e.displayName
                })
            ]
        }), Sidebar = ({ spaces: e, channels: t, directs: r, users: i, usersLoading: s, activeRoomId: a, userName: o, isAdmin: h, onSelectRoom: c, onOpenDM: u, onProfileClick: v, onLogout: C, onCreateSpace: d, onCreateRoom: S, onAdminPanel: _ })=>{
        const [g, T] = reactExports.useState(""), x = (I)=>{
            if (!g) return I;
            const D = g.toLowerCase();
            return I.filter((B)=>B.name.toLowerCase().includes(D));
        }, E = (I)=>{
            if (!g) return I;
            const D = g.toLowerCase();
            return I.filter((B)=>B.displayName.toLowerCase().includes(D) || B.userId.toLowerCase().includes(D));
        }, b = ((I)=>{
            if (!g) return I;
            const D = g.toLowerCase();
            return I.map((B)=>({
                    ...B,
                    rooms: B.rooms.filter((G)=>G.name.toLowerCase().includes(D))
                })).filter((B)=>B.name.toLowerCase().includes(D) || B.rooms.length > 0);
        })(e), w = x(t), j = x(r), M = E(i);
        return jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "chat-sidebar__header",
                    children: [
                        jsxRuntimeExports.jsx("span", {
                            className: "chat-sidebar__title",
                            children: "Uplink"
                        }),
                        h && jsxRuntimeExports.jsx("button", {
                            className: "chat-sidebar__admin-btn",
                            onClick: _,
                            title: "Управление пользователями",
                            children: jsxRuntimeExports.jsx(Settings, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsxs("div", {
                            className: "chat-sidebar__header-actions",
                            children: [
                                jsxRuntimeExports.jsx("button", {
                                    className: "chat-sidebar__profile-btn",
                                    onClick: v,
                                    title: "Настройки профиля",
                                    children: o
                                }),
                                jsxRuntimeExports.jsx("button", {
                                    className: "chat-sidebar__logout",
                                    onClick: C,
                                    title: "Выйти",
                                    children: jsxRuntimeExports.jsx(LogOut, {
                                        size: 16
                                    })
                                })
                            ]
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "chat-sidebar__search",
                    children: jsxRuntimeExports.jsx("input", {
                        className: "chat-sidebar__search-input",
                        type: "text",
                        placeholder: "Поиск...",
                        value: g,
                        onChange: (I)=>T(I.target.value)
                    })
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "chat-sidebar__rooms",
                    children: [
                        (b.length > 0 || h) && jsxRuntimeExports.jsxs("div", {
                            className: "chat-sidebar__section",
                            children: [
                                jsxRuntimeExports.jsxs("div", {
                                    className: "chat-sidebar__section-title-row",
                                    children: [
                                        jsxRuntimeExports.jsx("span", {
                                            className: "chat-sidebar__section-title chat-sidebar__section-title--inline",
                                            children: "Каналы"
                                        }),
                                        h && jsxRuntimeExports.jsx("button", {
                                            className: "chat-sidebar__section-add-btn",
                                            onClick: d,
                                            title: "Создать канал",
                                            children: jsxRuntimeExports.jsx(Plus, {
                                                size: 14
                                            })
                                        })
                                    ]
                                }),
                                b.map((I)=>jsxRuntimeExports.jsx(SpaceItem, {
                                        space: I,
                                        activeRoomId: a,
                                        isAdmin: h,
                                        onSelectRoom: c,
                                        onCreateRoom: S
                                    }, I.id))
                            ]
                        }),
                        w.length > 0 && jsxRuntimeExports.jsxs("div", {
                            className: "chat-sidebar__section",
                            children: [
                                jsxRuntimeExports.jsx("div", {
                                    className: "chat-sidebar__section-title",
                                    children: "Другие комнаты"
                                }),
                                w.map((I)=>jsxRuntimeExports.jsx(RoomItem, {
                                        room: I,
                                        active: I.id === a,
                                        onClick: ()=>c(I.id)
                                    }, I.id))
                            ]
                        }),
                        j.length > 0 && jsxRuntimeExports.jsxs("div", {
                            className: "chat-sidebar__section",
                            children: [
                                jsxRuntimeExports.jsx("div", {
                                    className: "chat-sidebar__section-title",
                                    children: "Личные сообщения"
                                }),
                                j.map((I)=>jsxRuntimeExports.jsx(RoomItem, {
                                        room: I,
                                        active: I.id === a,
                                        onClick: ()=>c(I.id)
                                    }, I.id))
                            ]
                        }),
                        jsxRuntimeExports.jsxs("div", {
                            className: "chat-sidebar__section",
                            children: [
                                jsxRuntimeExports.jsxs("div", {
                                    className: "chat-sidebar__section-title",
                                    children: [
                                        "Пользователи",
                                        s ? " ..." : ` (${M.length})`
                                    ]
                                }),
                                M.map((I)=>jsxRuntimeExports.jsx(UserItem, {
                                        user: I,
                                        onClick: ()=>u(I.userId)
                                    }, I.userId)),
                                !s && M.length === 0 && jsxRuntimeExports.jsx("div", {
                                    className: "chat-sidebar__empty",
                                    children: "Нет пользователей"
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    }, RoomHeader = ({ room: e, onBack: t, callState: r, activeCallRoomName: i, onJoinCall: s, onLeaveCall: a, pinnedMessages: o, onScrollToMessage: h, onUnpin: c, showBotSettings: u, onToggleBotSettings: v })=>{
        const [C, d] = reactExports.useState(!1), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState(e.encrypted), x = reactExports.useRef(null);
        reactExports.useEffect(()=>{
            T(e.encrypted);
        }, [
            e.id,
            e.encrypted
        ]), reactExports.useEffect(()=>{
            if (!C) return;
            const j = (M)=>{
                x.current && !x.current.contains(M.target) && d(!1);
            };
            return document.addEventListener("mousedown", j), ()=>document.removeEventListener("mousedown", j);
        }, [
            C
        ]);
        const E = i === e.id, y = i !== null && !E, b = o?.length || 0, w = async ()=>{
            try {
                await matrixService.rooms.enableEncryption(e.id), T(!0);
            } catch (j) {
                console.error("Ошибка включения шифрования:", j);
            }
            _(!1);
        };
        return jsxRuntimeExports.jsxs("div", {
            className: "room-header",
            children: [
                t && jsxRuntimeExports.jsx("button", {
                    className: "room-header__back",
                    onClick: t,
                    children: jsxRuntimeExports.jsx(ArrowLeft, {
                        size: 20
                    })
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "room-header__info",
                    children: [
                        jsxRuntimeExports.jsxs("div", {
                            className: "room-header__name",
                            children: [
                                e.type === "channel" ? "# " : "",
                                e.name
                            ]
                        }),
                        e.topic && jsxRuntimeExports.jsx("div", {
                            className: "room-header__topic",
                            children: e.topic
                        })
                    ]
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "room-header__actions",
                    children: [
                        g ? jsxRuntimeExports.jsx("span", {
                            className: "room-header__encryption-badge",
                            title: "Сквозное шифрование включено",
                            children: jsxRuntimeExports.jsx(Lock, {
                                size: 14
                            })
                        }) : jsxRuntimeExports.jsx("button", {
                            className: "room-header__btn",
                            onClick: ()=>_(!0),
                            title: "Включить сквозное шифрование",
                            children: jsxRuntimeExports.jsx(LockOpen, {
                                size: 14
                            })
                        }),
                        b > 0 && jsxRuntimeExports.jsxs("div", {
                            className: "room-header__pin-wrapper",
                            ref: x,
                            children: [
                                jsxRuntimeExports.jsxs("button", {
                                    className: `room-header__pin-btn ${C ? "room-header__pin-btn--active" : ""}`,
                                    onClick: ()=>d(!C),
                                    title: `Закреплённые сообщения (${b})`,
                                    children: [
                                        jsxRuntimeExports.jsx(Pin, {
                                            size: 14
                                        }),
                                        " ",
                                        b
                                    ]
                                }),
                                C && jsxRuntimeExports.jsxs("div", {
                                    className: "pinned-panel",
                                    children: [
                                        jsxRuntimeExports.jsx("div", {
                                            className: "pinned-panel__header",
                                            children: "Закреплённые сообщения"
                                        }),
                                        jsxRuntimeExports.jsx("div", {
                                            className: "pinned-panel__list",
                                            children: o.map((j)=>jsxRuntimeExports.jsxs("div", {
                                                    className: "pinned-panel__item",
                                                    onClick: ()=>{
                                                        h?.(j.id), d(!1);
                                                    },
                                                    children: [
                                                        jsxRuntimeExports.jsx("div", {
                                                            className: "pinned-panel__sender",
                                                            children: j.sender
                                                        }),
                                                        jsxRuntimeExports.jsx("div", {
                                                            className: "pinned-panel__body",
                                                            children: j.body
                                                        }),
                                                        c && jsxRuntimeExports.jsx("button", {
                                                            className: "pinned-panel__unpin",
                                                            onClick: (M)=>{
                                                                M.stopPropagation(), c(j.id);
                                                            },
                                                            title: "Открепить",
                                                            children: jsxRuntimeExports.jsx(X, {
                                                                size: 12
                                                            })
                                                        })
                                                    ]
                                                }, j.id))
                                        })
                                    ]
                                })
                            ]
                        }),
                        v && jsxRuntimeExports.jsx("button", {
                            className: `room-header__btn ${u ? "room-header__btn--active" : ""}`,
                            onClick: v,
                            title: "Боты",
                            children: jsxRuntimeExports.jsx(Bot, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("div", {
                            className: "room-header__call",
                            children: E ? jsxRuntimeExports.jsx("button", {
                                className: "room-header__call-btn room-header__call-btn--leave",
                                onClick: a,
                                title: "Завершить звонок",
                                children: jsxRuntimeExports.jsx(PhoneOff, {
                                    size: 16
                                })
                            }) : jsxRuntimeExports.jsx("button", {
                                className: "room-header__call-btn room-header__call-btn--join",
                                onClick: s,
                                disabled: y || r === "connecting",
                                title: y ? "Сначала завершите текущий звонок" : "Начать звонок",
                                children: r === "connecting" ? "..." : jsxRuntimeExports.jsx(Phone, {
                                    size: 16
                                })
                            })
                        })
                    ]
                }),
                S && jsxRuntimeExports.jsx("div", {
                    className: "profile-modal-overlay",
                    onClick: ()=>_(!1),
                    children: jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal",
                        onClick: (j)=>j.stopPropagation(),
                        children: [
                            jsxRuntimeExports.jsxs("div", {
                                className: "profile-modal__header",
                                children: [
                                    jsxRuntimeExports.jsx("span", {
                                        className: "profile-modal__title",
                                        children: "Включить шифрование?"
                                    }),
                                    jsxRuntimeExports.jsx("button", {
                                        className: "profile-modal__close",
                                        onClick: ()=>_(!1),
                                        children: "✕"
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "profile-modal__section",
                                children: [
                                    jsxRuntimeExports.jsx("p", {
                                        style: {
                                            color: "var(--uplink-text-secondary)",
                                            fontSize: 14,
                                            lineHeight: 1.5,
                                            margin: 0
                                        },
                                        children: "Сквозное шифрование (E2E) защитит все новые сообщения в этой комнате. Только участники смогут их прочитать."
                                    }),
                                    jsxRuntimeExports.jsx("div", {
                                        className: "create-modal__toggle-warning",
                                        style: {
                                            marginTop: 8
                                        },
                                        children: "Это действие необратимо — шифрование нельзя отключить после активации. Встроенные боты перестанут работать в этой комнате."
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                style: {
                                    display: "flex",
                                    gap: 8,
                                    justifyContent: "flex-end",
                                    padding: "0 20px 20px"
                                },
                                children: [
                                    jsxRuntimeExports.jsx("button", {
                                        className: "profile-modal__btn",
                                        onClick: ()=>_(!1),
                                        children: "Отмена"
                                    }),
                                    jsxRuntimeExports.jsx("button", {
                                        className: "profile-modal__btn profile-modal__btn--primary",
                                        onClick: w,
                                        children: "Включить шифрование"
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }, CodeSnippet = ({ body: e, codeContext: t })=>{
        const [r, i] = reactExports.useState(!1), s = async ()=>{
            try {
                await navigator.clipboard.writeText(e), i(!0), setTimeout(()=>i(!1), 2e3);
            } catch  {}
        }, a = t ? `${t.fileName}:${t.lineStart}-${t.lineEnd}` : "code";
        return jsxRuntimeExports.jsxs("div", {
            className: "code-snippet",
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "code-snippet__header",
                    children: [
                        jsxRuntimeExports.jsx("span", {
                            className: "code-snippet__file",
                            children: a
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "code-snippet__copy",
                            onClick: s,
                            children: r ? "Скопировано" : "Копировать"
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "code-snippet__body",
                    children: jsxRuntimeExports.jsx("pre", {
                        children: e
                    })
                })
            ]
        });
    };
    var lottie$1 = {
        exports: {}
    };
    (function(module, exports$1) {
        typeof document < "u" && typeof navigator < "u" && function(e, t) {
            module.exports = t();
        }(commonjsGlobal, function() {
            var svgNS = "http://www.w3.org/2000/svg", locationHref = "", _useWebWorker = !1, initialDefaultFrame = -999999, setWebWorker = function(t) {
                _useWebWorker = !!t;
            }, getWebWorker = function() {
                return _useWebWorker;
            }, setLocationHref = function(t) {
                locationHref = t;
            }, getLocationHref = function() {
                return locationHref;
            };
            function createTag(e) {
                return document.createElement(e);
            }
            function extendPrototype(e, t) {
                var r, i = e.length, s;
                for(r = 0; r < i; r += 1){
                    s = e[r].prototype;
                    for(var a in s)Object.prototype.hasOwnProperty.call(s, a) && (t.prototype[a] = s[a]);
                }
            }
            function getDescriptor(e, t) {
                return Object.getOwnPropertyDescriptor(e, t);
            }
            function createProxyFunction(e) {
                function t() {}
                return t.prototype = e, t;
            }
            var audioControllerFactory = function() {
                function e(t) {
                    this.audios = [], this.audioFactory = t, this._volume = 1, this._isMuted = !1;
                }
                return e.prototype = {
                    addAudio: function(r) {
                        this.audios.push(r);
                    },
                    pause: function() {
                        var r, i = this.audios.length;
                        for(r = 0; r < i; r += 1)this.audios[r].pause();
                    },
                    resume: function() {
                        var r, i = this.audios.length;
                        for(r = 0; r < i; r += 1)this.audios[r].resume();
                    },
                    setRate: function(r) {
                        var i, s = this.audios.length;
                        for(i = 0; i < s; i += 1)this.audios[i].setRate(r);
                    },
                    createAudio: function(r) {
                        return this.audioFactory ? this.audioFactory(r) : window.Howl ? new window.Howl({
                            src: [
                                r
                            ]
                        }) : {
                            isPlaying: !1,
                            play: function() {
                                this.isPlaying = !0;
                            },
                            seek: function() {
                                this.isPlaying = !1;
                            },
                            playing: function() {},
                            rate: function() {},
                            setVolume: function() {}
                        };
                    },
                    setAudioFactory: function(r) {
                        this.audioFactory = r;
                    },
                    setVolume: function(r) {
                        this._volume = r, this._updateVolume();
                    },
                    mute: function() {
                        this._isMuted = !0, this._updateVolume();
                    },
                    unmute: function() {
                        this._isMuted = !1, this._updateVolume();
                    },
                    getVolume: function() {
                        return this._volume;
                    },
                    _updateVolume: function() {
                        var r, i = this.audios.length;
                        for(r = 0; r < i; r += 1)this.audios[r].volume(this._volume * (this._isMuted ? 0 : 1));
                    }
                }, function() {
                    return new e;
                };
            }(), createTypedArray = function() {
                function e(r, i) {
                    var s = 0, a = [], o;
                    switch(r){
                        case "int16":
                        case "uint8c":
                            o = 1;
                            break;
                        default:
                            o = 1.1;
                            break;
                    }
                    for(s = 0; s < i; s += 1)a.push(o);
                    return a;
                }
                function t(r, i) {
                    return r === "float32" ? new Float32Array(i) : r === "int16" ? new Int16Array(i) : r === "uint8c" ? new Uint8ClampedArray(i) : e(r, i);
                }
                return typeof Uint8ClampedArray == "function" && typeof Float32Array == "function" ? t : e;
            }();
            function createSizedArray(e) {
                return Array.apply(null, {
                    length: e
                });
            }
            function _typeof$6(e) {
                "@babel/helpers - typeof";
                return _typeof$6 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$6(e);
            }
            var subframeEnabled = !0, expressionsPlugin = null, expressionsInterfaces = null, idPrefix$1 = "", isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent), bmPow = Math.pow, bmSqrt = Math.sqrt, bmFloor = Math.floor, bmMax = Math.max, bmMin = Math.min, BMMath = {};
            (function() {
                var e = [
                    "abs",
                    "acos",
                    "acosh",
                    "asin",
                    "asinh",
                    "atan",
                    "atanh",
                    "atan2",
                    "ceil",
                    "cbrt",
                    "expm1",
                    "clz32",
                    "cos",
                    "cosh",
                    "exp",
                    "floor",
                    "fround",
                    "hypot",
                    "imul",
                    "log",
                    "log1p",
                    "log2",
                    "log10",
                    "max",
                    "min",
                    "pow",
                    "random",
                    "round",
                    "sign",
                    "sin",
                    "sinh",
                    "sqrt",
                    "tan",
                    "tanh",
                    "trunc",
                    "E",
                    "LN10",
                    "LN2",
                    "LOG10E",
                    "LOG2E",
                    "PI",
                    "SQRT1_2",
                    "SQRT2"
                ], t, r = e.length;
                for(t = 0; t < r; t += 1)BMMath[e[t]] = Math[e[t]];
            })(), BMMath.random = Math.random, BMMath.abs = function(e) {
                var t = _typeof$6(e);
                if (t === "object" && e.length) {
                    var r = createSizedArray(e.length), i, s = e.length;
                    for(i = 0; i < s; i += 1)r[i] = Math.abs(e[i]);
                    return r;
                }
                return Math.abs(e);
            };
            var defaultCurveSegments = 150, degToRads = Math.PI / 180, roundCorner = .5519;
            function styleDiv(e) {
                e.style.position = "absolute", e.style.top = 0, e.style.left = 0, e.style.display = "block", e.style.transformOrigin = "0 0", e.style.webkitTransformOrigin = "0 0", e.style.backfaceVisibility = "visible", e.style.webkitBackfaceVisibility = "visible", e.style.transformStyle = "preserve-3d", e.style.webkitTransformStyle = "preserve-3d", e.style.mozTransformStyle = "preserve-3d";
            }
            function BMEnterFrameEvent(e, t, r, i) {
                this.type = e, this.currentTime = t, this.totalTime = r, this.direction = i < 0 ? -1 : 1;
            }
            function BMCompleteEvent(e, t) {
                this.type = e, this.direction = t < 0 ? -1 : 1;
            }
            function BMCompleteLoopEvent(e, t, r, i) {
                this.type = e, this.currentLoop = r, this.totalLoops = t, this.direction = i < 0 ? -1 : 1;
            }
            function BMSegmentStartEvent(e, t, r) {
                this.type = e, this.firstFrame = t, this.totalFrames = r;
            }
            function BMDestroyEvent(e, t) {
                this.type = e, this.target = t;
            }
            function BMRenderFrameErrorEvent(e, t) {
                this.type = "renderFrameError", this.nativeError = e, this.currentTime = t;
            }
            function BMConfigErrorEvent(e) {
                this.type = "configError", this.nativeError = e;
            }
            var createElementID = function() {
                var e = 0;
                return function() {
                    return e += 1, idPrefix$1 + "__lottie_element_" + e;
                };
            }();
            function HSVtoRGB(e, t, r) {
                var i, s, a, o, h, c, u, v;
                switch(o = Math.floor(e * 6), h = e * 6 - o, c = r * (1 - t), u = r * (1 - h * t), v = r * (1 - (1 - h) * t), o % 6){
                    case 0:
                        i = r, s = v, a = c;
                        break;
                    case 1:
                        i = u, s = r, a = c;
                        break;
                    case 2:
                        i = c, s = r, a = v;
                        break;
                    case 3:
                        i = c, s = u, a = r;
                        break;
                    case 4:
                        i = v, s = c, a = r;
                        break;
                    case 5:
                        i = r, s = c, a = u;
                        break;
                }
                return [
                    i,
                    s,
                    a
                ];
            }
            function RGBtoHSV(e, t, r) {
                var i = Math.max(e, t, r), s = Math.min(e, t, r), a = i - s, o, h = i === 0 ? 0 : a / i, c = i / 255;
                switch(i){
                    case s:
                        o = 0;
                        break;
                    case e:
                        o = t - r + a * (t < r ? 6 : 0), o /= 6 * a;
                        break;
                    case t:
                        o = r - e + a * 2, o /= 6 * a;
                        break;
                    case r:
                        o = e - t + a * 4, o /= 6 * a;
                        break;
                }
                return [
                    o,
                    h,
                    c
                ];
            }
            function addSaturationToRGB(e, t) {
                var r = RGBtoHSV(e[0] * 255, e[1] * 255, e[2] * 255);
                return r[1] += t, r[1] > 1 ? r[1] = 1 : r[1] <= 0 && (r[1] = 0), HSVtoRGB(r[0], r[1], r[2]);
            }
            function addBrightnessToRGB(e, t) {
                var r = RGBtoHSV(e[0] * 255, e[1] * 255, e[2] * 255);
                return r[2] += t, r[2] > 1 ? r[2] = 1 : r[2] < 0 && (r[2] = 0), HSVtoRGB(r[0], r[1], r[2]);
            }
            function addHueToRGB(e, t) {
                var r = RGBtoHSV(e[0] * 255, e[1] * 255, e[2] * 255);
                return r[0] += t / 360, r[0] > 1 ? r[0] -= 1 : r[0] < 0 && (r[0] += 1), HSVtoRGB(r[0], r[1], r[2]);
            }
            var rgbToHex = function() {
                var e = [], t, r;
                for(t = 0; t < 256; t += 1)r = t.toString(16), e[t] = r.length === 1 ? "0" + r : r;
                return function(i, s, a) {
                    return i < 0 && (i = 0), s < 0 && (s = 0), a < 0 && (a = 0), "#" + e[i] + e[s] + e[a];
                };
            }(), setSubframeEnabled = function(t) {
                subframeEnabled = !!t;
            }, getSubframeEnabled = function() {
                return subframeEnabled;
            }, setExpressionsPlugin = function(t) {
                expressionsPlugin = t;
            }, getExpressionsPlugin = function() {
                return expressionsPlugin;
            }, setExpressionInterfaces = function(t) {
                expressionsInterfaces = t;
            }, getExpressionInterfaces = function() {
                return expressionsInterfaces;
            }, setDefaultCurveSegments = function(t) {
                defaultCurveSegments = t;
            }, getDefaultCurveSegments = function() {
                return defaultCurveSegments;
            }, setIdPrefix = function(t) {
                idPrefix$1 = t;
            };
            function createNS(e) {
                return document.createElementNS(svgNS, e);
            }
            function _typeof$5(e) {
                "@babel/helpers - typeof";
                return _typeof$5 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$5(e);
            }
            var dataManager = function() {
                var e = 1, t = [], r, i, s = {
                    onmessage: function() {},
                    postMessage: function(S) {
                        r({
                            data: S
                        });
                    }
                }, a = {
                    postMessage: function(S) {
                        s.onmessage({
                            data: S
                        });
                    }
                };
                function o(d) {
                    if (window.Worker && window.Blob && getWebWorker()) {
                        var S = new Blob([
                            "var _workerSelf = self; self.onmessage = ",
                            d.toString()
                        ], {
                            type: "text/javascript"
                        }), _ = URL.createObjectURL(S);
                        return new Worker(_);
                    }
                    return r = d, s;
                }
                function h() {
                    i || (i = o(function(S) {
                        function _() {
                            function T(z, A) {
                                var F, P, R = z.length, L, N, $, O;
                                for(P = 0; P < R; P += 1)if (F = z[P], "ks" in F && !F.completed) {
                                    if (F.completed = !0, F.hasMask) {
                                        var H = F.masksProperties;
                                        for(N = H.length, L = 0; L < N; L += 1)if (H[L].pt.k.i) w(H[L].pt.k);
                                        else for(O = H[L].pt.k.length, $ = 0; $ < O; $ += 1)H[L].pt.k[$].s && w(H[L].pt.k[$].s[0]), H[L].pt.k[$].e && w(H[L].pt.k[$].e[0]);
                                    }
                                    F.ty === 0 ? (F.layers = y(F.refId, A), T(F.layers, A)) : F.ty === 4 ? b(F.shapes) : F.ty === 5 && U(F);
                                }
                            }
                            function x(z, A) {
                                if (z) {
                                    var F = 0, P = z.length;
                                    for(F = 0; F < P; F += 1)z[F].t === 1 && (z[F].data.layers = y(z[F].data.refId, A), T(z[F].data.layers, A));
                                }
                            }
                            function E(z, A) {
                                for(var F = 0, P = A.length; F < P;){
                                    if (A[F].id === z) return A[F];
                                    F += 1;
                                }
                                return null;
                            }
                            function y(z, A) {
                                var F = E(z, A);
                                return F ? F.layers.__used ? JSON.parse(JSON.stringify(F.layers)) : (F.layers.__used = !0, F.layers) : null;
                            }
                            function b(z) {
                                var A, F = z.length, P, R;
                                for(A = F - 1; A >= 0; A -= 1)if (z[A].ty === "sh") if (z[A].ks.k.i) w(z[A].ks.k);
                                else for(R = z[A].ks.k.length, P = 0; P < R; P += 1)z[A].ks.k[P].s && w(z[A].ks.k[P].s[0]), z[A].ks.k[P].e && w(z[A].ks.k[P].e[0]);
                                else z[A].ty === "gr" && b(z[A].it);
                            }
                            function w(z) {
                                var A, F = z.i.length;
                                for(A = 0; A < F; A += 1)z.i[A][0] += z.v[A][0], z.i[A][1] += z.v[A][1], z.o[A][0] += z.v[A][0], z.o[A][1] += z.v[A][1];
                            }
                            function j(z, A) {
                                var F = A ? A.split(".") : [
                                    100,
                                    100,
                                    100
                                ];
                                return z[0] > F[0] ? !0 : F[0] > z[0] ? !1 : z[1] > F[1] ? !0 : F[1] > z[1] ? !1 : z[2] > F[2] ? !0 : F[2] > z[2] ? !1 : null;
                            }
                            var M = function() {
                                var z = [
                                    4,
                                    4,
                                    14
                                ];
                                function A(P) {
                                    var R = P.t.d;
                                    P.t.d = {
                                        k: [
                                            {
                                                s: R,
                                                t: 0
                                            }
                                        ]
                                    };
                                }
                                function F(P) {
                                    var R, L = P.length;
                                    for(R = 0; R < L; R += 1)P[R].ty === 5 && A(P[R]);
                                }
                                return function(P) {
                                    if (j(z, P.v) && (F(P.layers), P.assets)) {
                                        var R, L = P.assets.length;
                                        for(R = 0; R < L; R += 1)P.assets[R].layers && F(P.assets[R].layers);
                                    }
                                };
                            }(), I = function() {
                                var z = [
                                    4,
                                    7,
                                    99
                                ];
                                return function(A) {
                                    if (A.chars && !j(z, A.v)) {
                                        var F, P = A.chars.length;
                                        for(F = 0; F < P; F += 1){
                                            var R = A.chars[F];
                                            R.data && R.data.shapes && (b(R.data.shapes), R.data.ip = 0, R.data.op = 99999, R.data.st = 0, R.data.sr = 1, R.data.ks = {
                                                p: {
                                                    k: [
                                                        0,
                                                        0
                                                    ],
                                                    a: 0
                                                },
                                                s: {
                                                    k: [
                                                        100,
                                                        100
                                                    ],
                                                    a: 0
                                                },
                                                a: {
                                                    k: [
                                                        0,
                                                        0
                                                    ],
                                                    a: 0
                                                },
                                                r: {
                                                    k: 0,
                                                    a: 0
                                                },
                                                o: {
                                                    k: 100,
                                                    a: 0
                                                }
                                            }, A.chars[F].t || (R.data.shapes.push({
                                                ty: "no"
                                            }), R.data.shapes[0].it.push({
                                                p: {
                                                    k: [
                                                        0,
                                                        0
                                                    ],
                                                    a: 0
                                                },
                                                s: {
                                                    k: [
                                                        100,
                                                        100
                                                    ],
                                                    a: 0
                                                },
                                                a: {
                                                    k: [
                                                        0,
                                                        0
                                                    ],
                                                    a: 0
                                                },
                                                r: {
                                                    k: 0,
                                                    a: 0
                                                },
                                                o: {
                                                    k: 100,
                                                    a: 0
                                                },
                                                sk: {
                                                    k: 0,
                                                    a: 0
                                                },
                                                sa: {
                                                    k: 0,
                                                    a: 0
                                                },
                                                ty: "tr"
                                            })));
                                        }
                                    }
                                };
                            }(), D = function() {
                                var z = [
                                    5,
                                    7,
                                    15
                                ];
                                function A(P) {
                                    var R = P.t.p;
                                    typeof R.a == "number" && (R.a = {
                                        a: 0,
                                        k: R.a
                                    }), typeof R.p == "number" && (R.p = {
                                        a: 0,
                                        k: R.p
                                    }), typeof R.r == "number" && (R.r = {
                                        a: 0,
                                        k: R.r
                                    });
                                }
                                function F(P) {
                                    var R, L = P.length;
                                    for(R = 0; R < L; R += 1)P[R].ty === 5 && A(P[R]);
                                }
                                return function(P) {
                                    if (j(z, P.v) && (F(P.layers), P.assets)) {
                                        var R, L = P.assets.length;
                                        for(R = 0; R < L; R += 1)P.assets[R].layers && F(P.assets[R].layers);
                                    }
                                };
                            }(), B = function() {
                                var z = [
                                    4,
                                    1,
                                    9
                                ];
                                function A(P) {
                                    var R, L = P.length, N, $;
                                    for(R = 0; R < L; R += 1)if (P[R].ty === "gr") A(P[R].it);
                                    else if (P[R].ty === "fl" || P[R].ty === "st") if (P[R].c.k && P[R].c.k[0].i) for($ = P[R].c.k.length, N = 0; N < $; N += 1)P[R].c.k[N].s && (P[R].c.k[N].s[0] /= 255, P[R].c.k[N].s[1] /= 255, P[R].c.k[N].s[2] /= 255, P[R].c.k[N].s[3] /= 255), P[R].c.k[N].e && (P[R].c.k[N].e[0] /= 255, P[R].c.k[N].e[1] /= 255, P[R].c.k[N].e[2] /= 255, P[R].c.k[N].e[3] /= 255);
                                    else P[R].c.k[0] /= 255, P[R].c.k[1] /= 255, P[R].c.k[2] /= 255, P[R].c.k[3] /= 255;
                                }
                                function F(P) {
                                    var R, L = P.length;
                                    for(R = 0; R < L; R += 1)P[R].ty === 4 && A(P[R].shapes);
                                }
                                return function(P) {
                                    if (j(z, P.v) && (F(P.layers), P.assets)) {
                                        var R, L = P.assets.length;
                                        for(R = 0; R < L; R += 1)P.assets[R].layers && F(P.assets[R].layers);
                                    }
                                };
                            }(), G = function() {
                                var z = [
                                    4,
                                    4,
                                    18
                                ];
                                function A(P) {
                                    var R, L = P.length, N, $;
                                    for(R = L - 1; R >= 0; R -= 1)if (P[R].ty === "sh") if (P[R].ks.k.i) P[R].ks.k.c = P[R].closed;
                                    else for($ = P[R].ks.k.length, N = 0; N < $; N += 1)P[R].ks.k[N].s && (P[R].ks.k[N].s[0].c = P[R].closed), P[R].ks.k[N].e && (P[R].ks.k[N].e[0].c = P[R].closed);
                                    else P[R].ty === "gr" && A(P[R].it);
                                }
                                function F(P) {
                                    var R, L, N = P.length, $, O, H, Y;
                                    for(L = 0; L < N; L += 1){
                                        if (R = P[L], R.hasMask) {
                                            var Z = R.masksProperties;
                                            for(O = Z.length, $ = 0; $ < O; $ += 1)if (Z[$].pt.k.i) Z[$].pt.k.c = Z[$].cl;
                                            else for(Y = Z[$].pt.k.length, H = 0; H < Y; H += 1)Z[$].pt.k[H].s && (Z[$].pt.k[H].s[0].c = Z[$].cl), Z[$].pt.k[H].e && (Z[$].pt.k[H].e[0].c = Z[$].cl);
                                        }
                                        R.ty === 4 && A(R.shapes);
                                    }
                                }
                                return function(P) {
                                    if (j(z, P.v) && (F(P.layers), P.assets)) {
                                        var R, L = P.assets.length;
                                        for(R = 0; R < L; R += 1)P.assets[R].layers && F(P.assets[R].layers);
                                    }
                                };
                            }();
                            function V(z) {
                                z.__complete || (B(z), M(z), I(z), D(z), G(z), T(z.layers, z.assets), x(z.chars, z.assets), z.__complete = !0);
                            }
                            function U(z) {
                                z.t.a.length === 0 && "m" in z.t.p;
                            }
                            var W = {};
                            return W.completeData = V, W.checkColors = B, W.checkChars = I, W.checkPathProperties = D, W.checkShapes = G, W.completeLayers = T, W;
                        }
                        if (a.dataManager || (a.dataManager = _()), a.assetLoader || (a.assetLoader = function() {
                            function T(E) {
                                var y = E.getResponseHeader("content-type");
                                return y && E.responseType === "json" && y.indexOf("json") !== -1 || E.response && _typeof$5(E.response) === "object" ? E.response : E.response && typeof E.response == "string" ? JSON.parse(E.response) : E.responseText ? JSON.parse(E.responseText) : null;
                            }
                            function x(E, y, b, w) {
                                var j, M = new XMLHttpRequest;
                                try {
                                    M.responseType = "json";
                                } catch  {}
                                M.onreadystatechange = function() {
                                    if (M.readyState === 4) if (M.status === 200) j = T(M), b(j);
                                    else try {
                                        j = T(M), b(j);
                                    } catch (I) {
                                        w && w(I);
                                    }
                                };
                                try {
                                    M.open([
                                        "G",
                                        "E",
                                        "T"
                                    ].join(""), E, !0);
                                } catch  {
                                    M.open([
                                        "G",
                                        "E",
                                        "T"
                                    ].join(""), y + "/" + E, !0);
                                }
                                M.send();
                            }
                            return {
                                load: x
                            };
                        }()), S.data.type === "loadAnimation") a.assetLoader.load(S.data.path, S.data.fullPath, function(T) {
                            a.dataManager.completeData(T), a.postMessage({
                                id: S.data.id,
                                payload: T,
                                status: "success"
                            });
                        }, function() {
                            a.postMessage({
                                id: S.data.id,
                                status: "error"
                            });
                        });
                        else if (S.data.type === "complete") {
                            var g = S.data.animation;
                            a.dataManager.completeData(g), a.postMessage({
                                id: S.data.id,
                                payload: g,
                                status: "success"
                            });
                        } else S.data.type === "loadData" && a.assetLoader.load(S.data.path, S.data.fullPath, function(T) {
                            a.postMessage({
                                id: S.data.id,
                                payload: T,
                                status: "success"
                            });
                        }, function() {
                            a.postMessage({
                                id: S.data.id,
                                status: "error"
                            });
                        });
                    }), i.onmessage = function(d) {
                        var S = d.data, _ = S.id, g = t[_];
                        t[_] = null, S.status === "success" ? g.onComplete(S.payload) : g.onError && g.onError();
                    });
                }
                function c(d, S) {
                    e += 1;
                    var _ = "processId_" + e;
                    return t[_] = {
                        onComplete: d,
                        onError: S
                    }, _;
                }
                function u(d, S, _) {
                    h();
                    var g = c(S, _);
                    i.postMessage({
                        type: "loadAnimation",
                        path: d,
                        fullPath: window.location.origin + window.location.pathname,
                        id: g
                    });
                }
                function v(d, S, _) {
                    h();
                    var g = c(S, _);
                    i.postMessage({
                        type: "loadData",
                        path: d,
                        fullPath: window.location.origin + window.location.pathname,
                        id: g
                    });
                }
                function C(d, S, _) {
                    h();
                    var g = c(S, _);
                    i.postMessage({
                        type: "complete",
                        animation: d,
                        id: g
                    });
                }
                return {
                    loadAnimation: u,
                    loadData: v,
                    completeAnimation: C
                };
            }(), ImagePreloader = function() {
                var e = function() {
                    var x = createTag("canvas");
                    x.width = 1, x.height = 1;
                    var E = x.getContext("2d");
                    return E.fillStyle = "rgba(0,0,0,0)", E.fillRect(0, 0, 1, 1), x;
                }();
                function t() {
                    this.loadedAssets += 1, this.loadedAssets === this.totalImages && this.loadedFootagesCount === this.totalFootages && this.imagesLoadedCb && this.imagesLoadedCb(null);
                }
                function r() {
                    this.loadedFootagesCount += 1, this.loadedAssets === this.totalImages && this.loadedFootagesCount === this.totalFootages && this.imagesLoadedCb && this.imagesLoadedCb(null);
                }
                function i(x, E, y) {
                    var b = "";
                    if (x.e) b = x.p;
                    else if (E) {
                        var w = x.p;
                        w.indexOf("images/") !== -1 && (w = w.split("/")[1]), b = E + w;
                    } else b = y, b += x.u ? x.u : "", b += x.p;
                    return b;
                }
                function s(x) {
                    var E = 0, y = setInterval(function() {
                        var b = x.getBBox();
                        (b.width || E > 500) && (this._imageLoaded(), clearInterval(y)), E += 1;
                    }.bind(this), 50);
                }
                function a(x) {
                    var E = i(x, this.assetsPath, this.path), y = createNS("image");
                    isSafari ? this.testImageLoaded(y) : y.addEventListener("load", this._imageLoaded, !1), y.addEventListener("error", function() {
                        b.img = e, this._imageLoaded();
                    }.bind(this), !1), y.setAttributeNS("http://www.w3.org/1999/xlink", "href", E), this._elementHelper.append ? this._elementHelper.append(y) : this._elementHelper.appendChild(y);
                    var b = {
                        img: y,
                        assetData: x
                    };
                    return b;
                }
                function o(x) {
                    var E = i(x, this.assetsPath, this.path), y = createTag("img");
                    y.crossOrigin = "anonymous", y.addEventListener("load", this._imageLoaded, !1), y.addEventListener("error", function() {
                        b.img = e, this._imageLoaded();
                    }.bind(this), !1), y.src = E;
                    var b = {
                        img: y,
                        assetData: x
                    };
                    return b;
                }
                function h(x) {
                    var E = {
                        assetData: x
                    }, y = i(x, this.assetsPath, this.path);
                    return dataManager.loadData(y, function(b) {
                        E.img = b, this._footageLoaded();
                    }.bind(this), function() {
                        E.img = {}, this._footageLoaded();
                    }.bind(this)), E;
                }
                function c(x, E) {
                    this.imagesLoadedCb = E;
                    var y, b = x.length;
                    for(y = 0; y < b; y += 1)x[y].layers || (!x[y].t || x[y].t === "seq" ? (this.totalImages += 1, this.images.push(this._createImageData(x[y]))) : x[y].t === 3 && (this.totalFootages += 1, this.images.push(this.createFootageData(x[y]))));
                }
                function u(x) {
                    this.path = x || "";
                }
                function v(x) {
                    this.assetsPath = x || "";
                }
                function C(x) {
                    for(var E = 0, y = this.images.length; E < y;){
                        if (this.images[E].assetData === x) return this.images[E].img;
                        E += 1;
                    }
                    return null;
                }
                function d() {
                    this.imagesLoadedCb = null, this.images.length = 0;
                }
                function S() {
                    return this.totalImages === this.loadedAssets;
                }
                function _() {
                    return this.totalFootages === this.loadedFootagesCount;
                }
                function g(x, E) {
                    x === "svg" ? (this._elementHelper = E, this._createImageData = this.createImageData.bind(this)) : this._createImageData = this.createImgData.bind(this);
                }
                function T() {
                    this._imageLoaded = t.bind(this), this._footageLoaded = r.bind(this), this.testImageLoaded = s.bind(this), this.createFootageData = h.bind(this), this.assetsPath = "", this.path = "", this.totalImages = 0, this.totalFootages = 0, this.loadedAssets = 0, this.loadedFootagesCount = 0, this.imagesLoadedCb = null, this.images = [];
                }
                return T.prototype = {
                    loadAssets: c,
                    setAssetsPath: v,
                    setPath: u,
                    loadedImages: S,
                    loadedFootages: _,
                    destroy: d,
                    getAsset: C,
                    createImgData: o,
                    createImageData: a,
                    imageLoaded: t,
                    footageLoaded: r,
                    setCacheType: g
                }, T;
            }();
            function BaseEvent() {}
            BaseEvent.prototype = {
                triggerEvent: function(t, r) {
                    if (this._cbs[t]) for(var i = this._cbs[t], s = 0; s < i.length; s += 1)i[s](r);
                },
                addEventListener: function(t, r) {
                    return this._cbs[t] || (this._cbs[t] = []), this._cbs[t].push(r), function() {
                        this.removeEventListener(t, r);
                    }.bind(this);
                },
                removeEventListener: function(t, r) {
                    if (!r) this._cbs[t] = null;
                    else if (this._cbs[t]) {
                        for(var i = 0, s = this._cbs[t].length; i < s;)this._cbs[t][i] === r && (this._cbs[t].splice(i, 1), i -= 1, s -= 1), i += 1;
                        this._cbs[t].length || (this._cbs[t] = null);
                    }
                }
            };
            var markerParser = function() {
                function e(t) {
                    for(var r = t.split(`\r
`), i = {}, s, a = 0, o = 0; o < r.length; o += 1)s = r[o].split(":"), s.length === 2 && (i[s[0]] = s[1].trim(), a += 1);
                    if (a === 0) throw new Error;
                    return i;
                }
                return function(t) {
                    for(var r = [], i = 0; i < t.length; i += 1){
                        var s = t[i], a = {
                            time: s.tm,
                            duration: s.dr
                        };
                        try {
                            a.payload = JSON.parse(t[i].cm);
                        } catch  {
                            try {
                                a.payload = e(t[i].cm);
                            } catch  {
                                a.payload = {
                                    name: t[i].cm
                                };
                            }
                        }
                        r.push(a);
                    }
                    return r;
                };
            }(), ProjectInterface = function() {
                function e(t) {
                    this.compositions.push(t);
                }
                return function() {
                    function t(r) {
                        for(var i = 0, s = this.compositions.length; i < s;){
                            if (this.compositions[i].data && this.compositions[i].data.nm === r) return this.compositions[i].prepareFrame && this.compositions[i].data.xt && this.compositions[i].prepareFrame(this.currentFrame), this.compositions[i].compInterface;
                            i += 1;
                        }
                        return null;
                    }
                    return t.compositions = [], t.currentFrame = 0, t.registerComposition = e, t;
                };
            }(), renderers = {}, registerRenderer = function(t, r) {
                renderers[t] = r;
            };
            function getRenderer(e) {
                return renderers[e];
            }
            function getRegisteredRenderer() {
                if (renderers.canvas) return "canvas";
                for(var e in renderers)if (renderers[e]) return e;
                return "";
            }
            function _typeof$4(e) {
                "@babel/helpers - typeof";
                return _typeof$4 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$4(e);
            }
            var AnimationItem = function() {
                this._cbs = [], this.name = "", this.path = "", this.isLoaded = !1, this.currentFrame = 0, this.currentRawFrame = 0, this.firstFrame = 0, this.totalFrames = 0, this.frameRate = 0, this.frameMult = 0, this.playSpeed = 1, this.playDirection = 1, this.playCount = 0, this.animationData = {}, this.assets = [], this.isPaused = !0, this.autoplay = !1, this.loop = !0, this.renderer = null, this.animationID = createElementID(), this.assetsPath = "", this.timeCompleted = 0, this.segmentPos = 0, this.isSubframeEnabled = getSubframeEnabled(), this.segments = [], this._idle = !0, this._completedLoop = !1, this.projectInterface = ProjectInterface(), this.imagePreloader = new ImagePreloader, this.audioController = audioControllerFactory(), this.markers = [], this.configAnimation = this.configAnimation.bind(this), this.onSetupError = this.onSetupError.bind(this), this.onSegmentComplete = this.onSegmentComplete.bind(this), this.drawnFrameEvent = new BMEnterFrameEvent("drawnFrame", 0, 0, 0), this.expressionsPlugin = getExpressionsPlugin();
            };
            extendPrototype([
                BaseEvent
            ], AnimationItem), AnimationItem.prototype.setParams = function(e) {
                (e.wrapper || e.container) && (this.wrapper = e.wrapper || e.container);
                var t = "svg";
                e.animType ? t = e.animType : e.renderer && (t = e.renderer);
                var r = getRenderer(t);
                this.renderer = new r(this, e.rendererSettings), this.imagePreloader.setCacheType(t, this.renderer.globalData.defs), this.renderer.setProjectInterface(this.projectInterface), this.animType = t, e.loop === "" || e.loop === null || e.loop === void 0 || e.loop === !0 ? this.loop = !0 : e.loop === !1 ? this.loop = !1 : this.loop = parseInt(e.loop, 10), this.autoplay = "autoplay" in e ? e.autoplay : !0, this.name = e.name ? e.name : "", this.autoloadSegments = Object.prototype.hasOwnProperty.call(e, "autoloadSegments") ? e.autoloadSegments : !0, this.assetsPath = e.assetsPath, this.initialSegment = e.initialSegment, e.audioFactory && this.audioController.setAudioFactory(e.audioFactory), e.animationData ? this.setupAnimation(e.animationData) : e.path && (e.path.lastIndexOf("\\") !== -1 ? this.path = e.path.substr(0, e.path.lastIndexOf("\\") + 1) : this.path = e.path.substr(0, e.path.lastIndexOf("/") + 1), this.fileName = e.path.substr(e.path.lastIndexOf("/") + 1), this.fileName = this.fileName.substr(0, this.fileName.lastIndexOf(".json")), dataManager.loadAnimation(e.path, this.configAnimation, this.onSetupError));
            }, AnimationItem.prototype.onSetupError = function() {
                this.trigger("data_failed");
            }, AnimationItem.prototype.setupAnimation = function(e) {
                dataManager.completeAnimation(e, this.configAnimation);
            }, AnimationItem.prototype.setData = function(e, t) {
                t && _typeof$4(t) !== "object" && (t = JSON.parse(t));
                var r = {
                    wrapper: e,
                    animationData: t
                }, i = e.attributes;
                r.path = i.getNamedItem("data-animation-path") ? i.getNamedItem("data-animation-path").value : i.getNamedItem("data-bm-path") ? i.getNamedItem("data-bm-path").value : i.getNamedItem("bm-path") ? i.getNamedItem("bm-path").value : "", r.animType = i.getNamedItem("data-anim-type") ? i.getNamedItem("data-anim-type").value : i.getNamedItem("data-bm-type") ? i.getNamedItem("data-bm-type").value : i.getNamedItem("bm-type") ? i.getNamedItem("bm-type").value : i.getNamedItem("data-bm-renderer") ? i.getNamedItem("data-bm-renderer").value : i.getNamedItem("bm-renderer") ? i.getNamedItem("bm-renderer").value : getRegisteredRenderer() || "canvas";
                var s = i.getNamedItem("data-anim-loop") ? i.getNamedItem("data-anim-loop").value : i.getNamedItem("data-bm-loop") ? i.getNamedItem("data-bm-loop").value : i.getNamedItem("bm-loop") ? i.getNamedItem("bm-loop").value : "";
                s === "false" ? r.loop = !1 : s === "true" ? r.loop = !0 : s !== "" && (r.loop = parseInt(s, 10));
                var a = i.getNamedItem("data-anim-autoplay") ? i.getNamedItem("data-anim-autoplay").value : i.getNamedItem("data-bm-autoplay") ? i.getNamedItem("data-bm-autoplay").value : i.getNamedItem("bm-autoplay") ? i.getNamedItem("bm-autoplay").value : !0;
                r.autoplay = a !== "false", r.name = i.getNamedItem("data-name") ? i.getNamedItem("data-name").value : i.getNamedItem("data-bm-name") ? i.getNamedItem("data-bm-name").value : i.getNamedItem("bm-name") ? i.getNamedItem("bm-name").value : "";
                var o = i.getNamedItem("data-anim-prerender") ? i.getNamedItem("data-anim-prerender").value : i.getNamedItem("data-bm-prerender") ? i.getNamedItem("data-bm-prerender").value : i.getNamedItem("bm-prerender") ? i.getNamedItem("bm-prerender").value : "";
                o === "false" && (r.prerender = !1), r.path ? this.setParams(r) : this.trigger("destroy");
            }, AnimationItem.prototype.includeLayers = function(e) {
                e.op > this.animationData.op && (this.animationData.op = e.op, this.totalFrames = Math.floor(e.op - this.animationData.ip));
                var t = this.animationData.layers, r, i = t.length, s = e.layers, a, o = s.length;
                for(a = 0; a < o; a += 1)for(r = 0; r < i;){
                    if (t[r].id === s[a].id) {
                        t[r] = s[a];
                        break;
                    }
                    r += 1;
                }
                if ((e.chars || e.fonts) && (this.renderer.globalData.fontManager.addChars(e.chars), this.renderer.globalData.fontManager.addFonts(e.fonts, this.renderer.globalData.defs)), e.assets) for(i = e.assets.length, r = 0; r < i; r += 1)this.animationData.assets.push(e.assets[r]);
                this.animationData.__complete = !1, dataManager.completeAnimation(this.animationData, this.onSegmentComplete);
            }, AnimationItem.prototype.onSegmentComplete = function(e) {
                this.animationData = e;
                var t = getExpressionsPlugin();
                t && t.initExpressions(this), this.loadNextSegment();
            }, AnimationItem.prototype.loadNextSegment = function() {
                var e = this.animationData.segments;
                if (!e || e.length === 0 || !this.autoloadSegments) {
                    this.trigger("data_ready"), this.timeCompleted = this.totalFrames;
                    return;
                }
                var t = e.shift();
                this.timeCompleted = t.time * this.frameRate;
                var r = this.path + this.fileName + "_" + this.segmentPos + ".json";
                this.segmentPos += 1, dataManager.loadData(r, this.includeLayers.bind(this), function() {
                    this.trigger("data_failed");
                }.bind(this));
            }, AnimationItem.prototype.loadSegments = function() {
                var e = this.animationData.segments;
                e || (this.timeCompleted = this.totalFrames), this.loadNextSegment();
            }, AnimationItem.prototype.imagesLoaded = function() {
                this.trigger("loaded_images"), this.checkLoaded();
            }, AnimationItem.prototype.preloadImages = function() {
                this.imagePreloader.setAssetsPath(this.assetsPath), this.imagePreloader.setPath(this.path), this.imagePreloader.loadAssets(this.animationData.assets, this.imagesLoaded.bind(this));
            }, AnimationItem.prototype.configAnimation = function(e) {
                if (this.renderer) try {
                    this.animationData = e, this.initialSegment ? (this.totalFrames = Math.floor(this.initialSegment[1] - this.initialSegment[0]), this.firstFrame = Math.round(this.initialSegment[0])) : (this.totalFrames = Math.floor(this.animationData.op - this.animationData.ip), this.firstFrame = Math.round(this.animationData.ip)), this.renderer.configAnimation(e), e.assets || (e.assets = []), this.assets = this.animationData.assets, this.frameRate = this.animationData.fr, this.frameMult = this.animationData.fr / 1e3, this.renderer.searchExtraCompositions(e.assets), this.markers = markerParser(e.markers || []), this.trigger("config_ready"), this.preloadImages(), this.loadSegments(), this.updaFrameModifier(), this.waitForFontsLoaded(), this.isPaused && this.audioController.pause();
                } catch (t) {
                    this.triggerConfigError(t);
                }
            }, AnimationItem.prototype.waitForFontsLoaded = function() {
                this.renderer && (this.renderer.globalData.fontManager.isLoaded ? this.checkLoaded() : setTimeout(this.waitForFontsLoaded.bind(this), 20));
            }, AnimationItem.prototype.checkLoaded = function() {
                if (!this.isLoaded && this.renderer.globalData.fontManager.isLoaded && (this.imagePreloader.loadedImages() || this.renderer.rendererType !== "canvas") && this.imagePreloader.loadedFootages()) {
                    this.isLoaded = !0;
                    var e = getExpressionsPlugin();
                    e && e.initExpressions(this), this.renderer.initItems(), setTimeout(function() {
                        this.trigger("DOMLoaded");
                    }.bind(this), 0), this.gotoFrame(), this.autoplay && this.play();
                }
            }, AnimationItem.prototype.resize = function(e, t) {
                var r = typeof e == "number" ? e : void 0, i = typeof t == "number" ? t : void 0;
                this.renderer.updateContainerSize(r, i);
            }, AnimationItem.prototype.setSubframe = function(e) {
                this.isSubframeEnabled = !!e;
            }, AnimationItem.prototype.gotoFrame = function() {
                this.currentFrame = this.isSubframeEnabled ? this.currentRawFrame : ~~this.currentRawFrame, this.timeCompleted !== this.totalFrames && this.currentFrame > this.timeCompleted && (this.currentFrame = this.timeCompleted), this.trigger("enterFrame"), this.renderFrame(), this.trigger("drawnFrame");
            }, AnimationItem.prototype.renderFrame = function() {
                if (!(this.isLoaded === !1 || !this.renderer)) try {
                    this.expressionsPlugin && this.expressionsPlugin.resetFrame(), this.renderer.renderFrame(this.currentFrame + this.firstFrame);
                } catch (e) {
                    this.triggerRenderFrameError(e);
                }
            }, AnimationItem.prototype.play = function(e) {
                e && this.name !== e || this.isPaused === !0 && (this.isPaused = !1, this.trigger("_play"), this.audioController.resume(), this._idle && (this._idle = !1, this.trigger("_active")));
            }, AnimationItem.prototype.pause = function(e) {
                e && this.name !== e || this.isPaused === !1 && (this.isPaused = !0, this.trigger("_pause"), this._idle = !0, this.trigger("_idle"), this.audioController.pause());
            }, AnimationItem.prototype.togglePause = function(e) {
                e && this.name !== e || (this.isPaused === !0 ? this.play() : this.pause());
            }, AnimationItem.prototype.stop = function(e) {
                e && this.name !== e || (this.pause(), this.playCount = 0, this._completedLoop = !1, this.setCurrentRawFrameValue(0));
            }, AnimationItem.prototype.getMarkerData = function(e) {
                for(var t, r = 0; r < this.markers.length; r += 1)if (t = this.markers[r], t.payload && t.payload.name === e) return t;
                return null;
            }, AnimationItem.prototype.goToAndStop = function(e, t, r) {
                if (!(r && this.name !== r)) {
                    var i = Number(e);
                    if (isNaN(i)) {
                        var s = this.getMarkerData(e);
                        s && this.goToAndStop(s.time, !0);
                    } else t ? this.setCurrentRawFrameValue(e) : this.setCurrentRawFrameValue(e * this.frameModifier);
                    this.pause();
                }
            }, AnimationItem.prototype.goToAndPlay = function(e, t, r) {
                if (!(r && this.name !== r)) {
                    var i = Number(e);
                    if (isNaN(i)) {
                        var s = this.getMarkerData(e);
                        s && (s.duration ? this.playSegments([
                            s.time,
                            s.time + s.duration
                        ], !0) : this.goToAndStop(s.time, !0));
                    } else this.goToAndStop(i, t, r);
                    this.play();
                }
            }, AnimationItem.prototype.advanceTime = function(e) {
                if (!(this.isPaused === !0 || this.isLoaded === !1)) {
                    var t = this.currentRawFrame + e * this.frameModifier, r = !1;
                    t >= this.totalFrames - 1 && this.frameModifier > 0 ? !this.loop || this.playCount === this.loop ? this.checkSegments(t > this.totalFrames ? t % this.totalFrames : 0) || (r = !0, t = this.totalFrames - 1) : t >= this.totalFrames ? (this.playCount += 1, this.checkSegments(t % this.totalFrames) || (this.setCurrentRawFrameValue(t % this.totalFrames), this._completedLoop = !0, this.trigger("loopComplete"))) : this.setCurrentRawFrameValue(t) : t < 0 ? this.checkSegments(t % this.totalFrames) || (this.loop && !(this.playCount-- <= 0 && this.loop !== !0) ? (this.setCurrentRawFrameValue(this.totalFrames + t % this.totalFrames), this._completedLoop ? this.trigger("loopComplete") : this._completedLoop = !0) : (r = !0, t = 0)) : this.setCurrentRawFrameValue(t), r && (this.setCurrentRawFrameValue(t), this.pause(), this.trigger("complete"));
                }
            }, AnimationItem.prototype.adjustSegment = function(e, t) {
                this.playCount = 0, e[1] < e[0] ? (this.frameModifier > 0 && (this.playSpeed < 0 ? this.setSpeed(-this.playSpeed) : this.setDirection(-1)), this.totalFrames = e[0] - e[1], this.timeCompleted = this.totalFrames, this.firstFrame = e[1], this.setCurrentRawFrameValue(this.totalFrames - .001 - t)) : e[1] > e[0] && (this.frameModifier < 0 && (this.playSpeed < 0 ? this.setSpeed(-this.playSpeed) : this.setDirection(1)), this.totalFrames = e[1] - e[0], this.timeCompleted = this.totalFrames, this.firstFrame = e[0], this.setCurrentRawFrameValue(.001 + t)), this.trigger("segmentStart");
            }, AnimationItem.prototype.setSegment = function(e, t) {
                var r = -1;
                this.isPaused && (this.currentRawFrame + this.firstFrame < e ? r = e : this.currentRawFrame + this.firstFrame > t && (r = t - e)), this.firstFrame = e, this.totalFrames = t - e, this.timeCompleted = this.totalFrames, r !== -1 && this.goToAndStop(r, !0);
            }, AnimationItem.prototype.playSegments = function(e, t) {
                if (t && (this.segments.length = 0), _typeof$4(e[0]) === "object") {
                    var r, i = e.length;
                    for(r = 0; r < i; r += 1)this.segments.push(e[r]);
                } else this.segments.push(e);
                this.segments.length && t && this.adjustSegment(this.segments.shift(), 0), this.isPaused && this.play();
            }, AnimationItem.prototype.resetSegments = function(e) {
                this.segments.length = 0, this.segments.push([
                    this.animationData.ip,
                    this.animationData.op
                ]), e && this.checkSegments(0);
            }, AnimationItem.prototype.checkSegments = function(e) {
                return this.segments.length ? (this.adjustSegment(this.segments.shift(), e), !0) : !1;
            }, AnimationItem.prototype.destroy = function(e) {
                e && this.name !== e || !this.renderer || (this.renderer.destroy(), this.imagePreloader.destroy(), this.trigger("destroy"), this._cbs = null, this.onEnterFrame = null, this.onLoopComplete = null, this.onComplete = null, this.onSegmentStart = null, this.onDestroy = null, this.renderer = null, this.expressionsPlugin = null, this.imagePreloader = null, this.projectInterface = null);
            }, AnimationItem.prototype.setCurrentRawFrameValue = function(e) {
                this.currentRawFrame = e, this.gotoFrame();
            }, AnimationItem.prototype.setSpeed = function(e) {
                this.playSpeed = e, this.updaFrameModifier();
            }, AnimationItem.prototype.setDirection = function(e) {
                this.playDirection = e < 0 ? -1 : 1, this.updaFrameModifier();
            }, AnimationItem.prototype.setLoop = function(e) {
                this.loop = e;
            }, AnimationItem.prototype.setVolume = function(e, t) {
                t && this.name !== t || this.audioController.setVolume(e);
            }, AnimationItem.prototype.getVolume = function() {
                return this.audioController.getVolume();
            }, AnimationItem.prototype.mute = function(e) {
                e && this.name !== e || this.audioController.mute();
            }, AnimationItem.prototype.unmute = function(e) {
                e && this.name !== e || this.audioController.unmute();
            }, AnimationItem.prototype.updaFrameModifier = function() {
                this.frameModifier = this.frameMult * this.playSpeed * this.playDirection, this.audioController.setRate(this.playSpeed * this.playDirection);
            }, AnimationItem.prototype.getPath = function() {
                return this.path;
            }, AnimationItem.prototype.getAssetsPath = function(e) {
                var t = "";
                if (e.e) t = e.p;
                else if (this.assetsPath) {
                    var r = e.p;
                    r.indexOf("images/") !== -1 && (r = r.split("/")[1]), t = this.assetsPath + r;
                } else t = this.path, t += e.u ? e.u : "", t += e.p;
                return t;
            }, AnimationItem.prototype.getAssetData = function(e) {
                for(var t = 0, r = this.assets.length; t < r;){
                    if (e === this.assets[t].id) return this.assets[t];
                    t += 1;
                }
                return null;
            }, AnimationItem.prototype.hide = function() {
                this.renderer.hide();
            }, AnimationItem.prototype.show = function() {
                this.renderer.show();
            }, AnimationItem.prototype.getDuration = function(e) {
                return e ? this.totalFrames : this.totalFrames / this.frameRate;
            }, AnimationItem.prototype.updateDocumentData = function(e, t, r) {
                try {
                    var i = this.renderer.getElementByPath(e);
                    i.updateDocumentData(t, r);
                } catch  {}
            }, AnimationItem.prototype.trigger = function(e) {
                if (this._cbs && this._cbs[e]) switch(e){
                    case "enterFrame":
                        this.triggerEvent(e, new BMEnterFrameEvent(e, this.currentFrame, this.totalFrames, this.frameModifier));
                        break;
                    case "drawnFrame":
                        this.drawnFrameEvent.currentTime = this.currentFrame, this.drawnFrameEvent.totalTime = this.totalFrames, this.drawnFrameEvent.direction = this.frameModifier, this.triggerEvent(e, this.drawnFrameEvent);
                        break;
                    case "loopComplete":
                        this.triggerEvent(e, new BMCompleteLoopEvent(e, this.loop, this.playCount, this.frameMult));
                        break;
                    case "complete":
                        this.triggerEvent(e, new BMCompleteEvent(e, this.frameMult));
                        break;
                    case "segmentStart":
                        this.triggerEvent(e, new BMSegmentStartEvent(e, this.firstFrame, this.totalFrames));
                        break;
                    case "destroy":
                        this.triggerEvent(e, new BMDestroyEvent(e, this));
                        break;
                    default:
                        this.triggerEvent(e);
                }
                e === "enterFrame" && this.onEnterFrame && this.onEnterFrame.call(this, new BMEnterFrameEvent(e, this.currentFrame, this.totalFrames, this.frameMult)), e === "loopComplete" && this.onLoopComplete && this.onLoopComplete.call(this, new BMCompleteLoopEvent(e, this.loop, this.playCount, this.frameMult)), e === "complete" && this.onComplete && this.onComplete.call(this, new BMCompleteEvent(e, this.frameMult)), e === "segmentStart" && this.onSegmentStart && this.onSegmentStart.call(this, new BMSegmentStartEvent(e, this.firstFrame, this.totalFrames)), e === "destroy" && this.onDestroy && this.onDestroy.call(this, new BMDestroyEvent(e, this));
            }, AnimationItem.prototype.triggerRenderFrameError = function(e) {
                var t = new BMRenderFrameErrorEvent(e, this.currentFrame);
                this.triggerEvent("error", t), this.onError && this.onError.call(this, t);
            }, AnimationItem.prototype.triggerConfigError = function(e) {
                var t = new BMConfigErrorEvent(e, this.currentFrame);
                this.triggerEvent("error", t), this.onError && this.onError.call(this, t);
            };
            var animationManager = function() {
                var e = {}, t = [], r = 0, i = 0, s = 0, a = !0, o = !1;
                function h(A) {
                    for(var F = 0, P = A.target; F < i;)t[F].animation === P && (t.splice(F, 1), F -= 1, i -= 1, P.isPaused || C()), F += 1;
                }
                function c(A, F) {
                    if (!A) return null;
                    for(var P = 0; P < i;){
                        if (t[P].elem === A && t[P].elem !== null) return t[P].animation;
                        P += 1;
                    }
                    var R = new AnimationItem;
                    return d(R, A), R.setData(A, F), R;
                }
                function u() {
                    var A, F = t.length, P = [];
                    for(A = 0; A < F; A += 1)P.push(t[A].animation);
                    return P;
                }
                function v() {
                    s += 1, B();
                }
                function C() {
                    s -= 1;
                }
                function d(A, F) {
                    A.addEventListener("destroy", h), A.addEventListener("_active", v), A.addEventListener("_idle", C), t.push({
                        elem: F,
                        animation: A
                    }), i += 1;
                }
                function S(A) {
                    var F = new AnimationItem;
                    return d(F, null), F.setParams(A), F;
                }
                function _(A, F) {
                    var P;
                    for(P = 0; P < i; P += 1)t[P].animation.setSpeed(A, F);
                }
                function g(A, F) {
                    var P;
                    for(P = 0; P < i; P += 1)t[P].animation.setDirection(A, F);
                }
                function T(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.play(A);
                }
                function x(A) {
                    var F = A - r, P;
                    for(P = 0; P < i; P += 1)t[P].animation.advanceTime(F);
                    r = A, s && !o ? window.requestAnimationFrame(x) : a = !0;
                }
                function E(A) {
                    r = A, window.requestAnimationFrame(x);
                }
                function y(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.pause(A);
                }
                function b(A, F, P) {
                    var R;
                    for(R = 0; R < i; R += 1)t[R].animation.goToAndStop(A, F, P);
                }
                function w(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.stop(A);
                }
                function j(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.togglePause(A);
                }
                function M(A) {
                    var F;
                    for(F = i - 1; F >= 0; F -= 1)t[F].animation.destroy(A);
                }
                function I(A, F, P) {
                    var R = [].concat([].slice.call(document.getElementsByClassName("lottie")), [].slice.call(document.getElementsByClassName("bodymovin"))), L, N = R.length;
                    for(L = 0; L < N; L += 1)P && R[L].setAttribute("data-bm-type", P), c(R[L], A);
                    if (F && N === 0) {
                        P || (P = "svg");
                        var $ = document.getElementsByTagName("body")[0];
                        $.innerText = "";
                        var O = createTag("div");
                        O.style.width = "100%", O.style.height = "100%", O.setAttribute("data-bm-type", P), $.appendChild(O), c(O, A);
                    }
                }
                function D() {
                    var A;
                    for(A = 0; A < i; A += 1)t[A].animation.resize();
                }
                function B() {
                    !o && s && a && (window.requestAnimationFrame(E), a = !1);
                }
                function G() {
                    o = !0;
                }
                function V() {
                    o = !1, B();
                }
                function U(A, F) {
                    var P;
                    for(P = 0; P < i; P += 1)t[P].animation.setVolume(A, F);
                }
                function W(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.mute(A);
                }
                function z(A) {
                    var F;
                    for(F = 0; F < i; F += 1)t[F].animation.unmute(A);
                }
                return e.registerAnimation = c, e.loadAnimation = S, e.setSpeed = _, e.setDirection = g, e.play = T, e.pause = y, e.stop = w, e.togglePause = j, e.searchAnimations = I, e.resize = D, e.goToAndStop = b, e.destroy = M, e.freeze = G, e.unfreeze = V, e.setVolume = U, e.mute = W, e.unmute = z, e.getRegisteredAnimations = u, e;
            }(), BezierFactory = function() {
                var e = {};
                e.getBezierEasing = r;
                var t = {};
                function r(E, y, b, w, j) {
                    var M = j || ("bez_" + E + "_" + y + "_" + b + "_" + w).replace(/\./g, "p");
                    if (t[M]) return t[M];
                    var I = new x([
                        E,
                        y,
                        b,
                        w
                    ]);
                    return t[M] = I, I;
                }
                var i = 4, s = .001, a = 1e-7, o = 10, h = 11, c = 1 / (h - 1), u = typeof Float32Array == "function";
                function v(E, y) {
                    return 1 - 3 * y + 3 * E;
                }
                function C(E, y) {
                    return 3 * y - 6 * E;
                }
                function d(E) {
                    return 3 * E;
                }
                function S(E, y, b) {
                    return ((v(y, b) * E + C(y, b)) * E + d(y)) * E;
                }
                function _(E, y, b) {
                    return 3 * v(y, b) * E * E + 2 * C(y, b) * E + d(y);
                }
                function g(E, y, b, w, j) {
                    var M, I, D = 0;
                    do I = y + (b - y) / 2, M = S(I, w, j) - E, M > 0 ? b = I : y = I;
                    while (Math.abs(M) > a && ++D < o);
                    return I;
                }
                function T(E, y, b, w) {
                    for(var j = 0; j < i; ++j){
                        var M = _(y, b, w);
                        if (M === 0) return y;
                        var I = S(y, b, w) - E;
                        y -= I / M;
                    }
                    return y;
                }
                function x(E) {
                    this._p = E, this._mSampleValues = u ? new Float32Array(h) : new Array(h), this._precomputed = !1, this.get = this.get.bind(this);
                }
                return x.prototype = {
                    get: function(y) {
                        var b = this._p[0], w = this._p[1], j = this._p[2], M = this._p[3];
                        return this._precomputed || this._precompute(), b === w && j === M ? y : y === 0 ? 0 : y === 1 ? 1 : S(this._getTForX(y), w, M);
                    },
                    _precompute: function() {
                        var y = this._p[0], b = this._p[1], w = this._p[2], j = this._p[3];
                        this._precomputed = !0, (y !== b || w !== j) && this._calcSampleValues();
                    },
                    _calcSampleValues: function() {
                        for(var y = this._p[0], b = this._p[2], w = 0; w < h; ++w)this._mSampleValues[w] = S(w * c, y, b);
                    },
                    _getTForX: function(y) {
                        for(var b = this._p[0], w = this._p[2], j = this._mSampleValues, M = 0, I = 1, D = h - 1; I !== D && j[I] <= y; ++I)M += c;
                        --I;
                        var B = (y - j[I]) / (j[I + 1] - j[I]), G = M + B * c, V = _(G, b, w);
                        return V >= s ? T(y, G, b, w) : V === 0 ? G : g(y, M, M + c, b, w);
                    }
                }, e;
            }(), pooling = function() {
                function e(t) {
                    return t.concat(createSizedArray(t.length));
                }
                return {
                    double: e
                };
            }(), poolFactory = function() {
                return function(e, t, r) {
                    var i = 0, s = e, a = createSizedArray(s), o = {
                        newElement: h,
                        release: c
                    };
                    function h() {
                        var u;
                        return i ? (i -= 1, u = a[i]) : u = t(), u;
                    }
                    function c(u) {
                        i === s && (a = pooling.double(a), s *= 2), r && r(u), a[i] = u, i += 1;
                    }
                    return o;
                };
            }(), bezierLengthPool = function() {
                function e() {
                    return {
                        addedLength: 0,
                        percents: createTypedArray("float32", getDefaultCurveSegments()),
                        lengths: createTypedArray("float32", getDefaultCurveSegments())
                    };
                }
                return poolFactory(8, e);
            }(), segmentsLengthPool = function() {
                function e() {
                    return {
                        lengths: [],
                        totalLength: 0
                    };
                }
                function t(r) {
                    var i, s = r.lengths.length;
                    for(i = 0; i < s; i += 1)bezierLengthPool.release(r.lengths[i]);
                    r.lengths.length = 0;
                }
                return poolFactory(8, e, t);
            }();
            function bezFunction() {
                var e = Math;
                function t(d, S, _, g, T, x) {
                    var E = d * g + S * T + _ * x - T * g - x * d - _ * S;
                    return E > -.001 && E < .001;
                }
                function r(d, S, _, g, T, x, E, y, b) {
                    if (_ === 0 && x === 0 && b === 0) return t(d, S, g, T, E, y);
                    var w = e.sqrt(e.pow(g - d, 2) + e.pow(T - S, 2) + e.pow(x - _, 2)), j = e.sqrt(e.pow(E - d, 2) + e.pow(y - S, 2) + e.pow(b - _, 2)), M = e.sqrt(e.pow(E - g, 2) + e.pow(y - T, 2) + e.pow(b - x, 2)), I;
                    return w > j ? w > M ? I = w - j - M : I = M - j - w : M > j ? I = M - j - w : I = j - w - M, I > -1e-4 && I < 1e-4;
                }
                var i = function() {
                    return function(d, S, _, g) {
                        var T = getDefaultCurveSegments(), x, E, y, b, w, j = 0, M, I = [], D = [], B = bezierLengthPool.newElement();
                        for(y = _.length, x = 0; x < T; x += 1){
                            for(w = x / (T - 1), M = 0, E = 0; E < y; E += 1)b = bmPow(1 - w, 3) * d[E] + 3 * bmPow(1 - w, 2) * w * _[E] + 3 * (1 - w) * bmPow(w, 2) * g[E] + bmPow(w, 3) * S[E], I[E] = b, D[E] !== null && (M += bmPow(I[E] - D[E], 2)), D[E] = I[E];
                            M && (M = bmSqrt(M), j += M), B.percents[x] = w, B.lengths[x] = j;
                        }
                        return B.addedLength = j, B;
                    };
                }();
                function s(d) {
                    var S = segmentsLengthPool.newElement(), _ = d.c, g = d.v, T = d.o, x = d.i, E, y = d._length, b = S.lengths, w = 0;
                    for(E = 0; E < y - 1; E += 1)b[E] = i(g[E], g[E + 1], T[E], x[E + 1]), w += b[E].addedLength;
                    return _ && y && (b[E] = i(g[E], g[0], T[E], x[0]), w += b[E].addedLength), S.totalLength = w, S;
                }
                function a(d) {
                    this.segmentLength = 0, this.points = new Array(d);
                }
                function o(d, S) {
                    this.partialLength = d, this.point = S;
                }
                var h = function() {
                    var d = {};
                    return function(S, _, g, T) {
                        var x = (S[0] + "_" + S[1] + "_" + _[0] + "_" + _[1] + "_" + g[0] + "_" + g[1] + "_" + T[0] + "_" + T[1]).replace(/\./g, "p");
                        if (!d[x]) {
                            var E = getDefaultCurveSegments(), y, b, w, j, M, I = 0, D, B, G = null;
                            S.length === 2 && (S[0] !== _[0] || S[1] !== _[1]) && t(S[0], S[1], _[0], _[1], S[0] + g[0], S[1] + g[1]) && t(S[0], S[1], _[0], _[1], _[0] + T[0], _[1] + T[1]) && (E = 2);
                            var V = new a(E);
                            for(w = g.length, y = 0; y < E; y += 1){
                                for(B = createSizedArray(w), M = y / (E - 1), D = 0, b = 0; b < w; b += 1)j = bmPow(1 - M, 3) * S[b] + 3 * bmPow(1 - M, 2) * M * (S[b] + g[b]) + 3 * (1 - M) * bmPow(M, 2) * (_[b] + T[b]) + bmPow(M, 3) * _[b], B[b] = j, G !== null && (D += bmPow(B[b] - G[b], 2));
                                D = bmSqrt(D), I += D, V.points[y] = new o(D, B), G = B;
                            }
                            V.segmentLength = I, d[x] = V;
                        }
                        return d[x];
                    };
                }();
                function c(d, S) {
                    var _ = S.percents, g = S.lengths, T = _.length, x = bmFloor((T - 1) * d), E = d * S.addedLength, y = 0;
                    if (x === T - 1 || x === 0 || E === g[x]) return _[x];
                    for(var b = g[x] > E ? -1 : 1, w = !0; w;)if (g[x] <= E && g[x + 1] > E ? (y = (E - g[x]) / (g[x + 1] - g[x]), w = !1) : x += b, x < 0 || x >= T - 1) {
                        if (x === T - 1) return _[x];
                        w = !1;
                    }
                    return _[x] + (_[x + 1] - _[x]) * y;
                }
                function u(d, S, _, g, T, x) {
                    var E = c(T, x), y = 1 - E, b = e.round((y * y * y * d[0] + (E * y * y + y * E * y + y * y * E) * _[0] + (E * E * y + y * E * E + E * y * E) * g[0] + E * E * E * S[0]) * 1e3) / 1e3, w = e.round((y * y * y * d[1] + (E * y * y + y * E * y + y * y * E) * _[1] + (E * E * y + y * E * E + E * y * E) * g[1] + E * E * E * S[1]) * 1e3) / 1e3;
                    return [
                        b,
                        w
                    ];
                }
                var v = createTypedArray("float32", 8);
                function C(d, S, _, g, T, x, E) {
                    T < 0 ? T = 0 : T > 1 && (T = 1);
                    var y = c(T, E);
                    x = x > 1 ? 1 : x;
                    var b = c(x, E), w, j = d.length, M = 1 - y, I = 1 - b, D = M * M * M, B = y * M * M * 3, G = y * y * M * 3, V = y * y * y, U = M * M * I, W = y * M * I + M * y * I + M * M * b, z = y * y * I + M * y * b + y * M * b, A = y * y * b, F = M * I * I, P = y * I * I + M * b * I + M * I * b, R = y * b * I + M * b * b + y * I * b, L = y * b * b, N = I * I * I, $ = b * I * I + I * b * I + I * I * b, O = b * b * I + I * b * b + b * I * b, H = b * b * b;
                    for(w = 0; w < j; w += 1)v[w * 4] = e.round((D * d[w] + B * _[w] + G * g[w] + V * S[w]) * 1e3) / 1e3, v[w * 4 + 1] = e.round((U * d[w] + W * _[w] + z * g[w] + A * S[w]) * 1e3) / 1e3, v[w * 4 + 2] = e.round((F * d[w] + P * _[w] + R * g[w] + L * S[w]) * 1e3) / 1e3, v[w * 4 + 3] = e.round((N * d[w] + $ * _[w] + O * g[w] + H * S[w]) * 1e3) / 1e3;
                    return v;
                }
                return {
                    getSegmentsLength: s,
                    getNewSegment: C,
                    getPointInSegment: u,
                    buildBezierData: h,
                    pointOnLine2D: t,
                    pointOnLine3D: r
                };
            }
            var bez = bezFunction(), initFrame = initialDefaultFrame, mathAbs = Math.abs;
            function interpolateValue(e, t) {
                var r = this.offsetTime, i;
                this.propType === "multidimensional" && (i = createTypedArray("float32", this.pv.length));
                for(var s = t.lastIndex, a = s, o = this.keyframes.length - 1, h = !0, c, u, v; h;){
                    if (c = this.keyframes[a], u = this.keyframes[a + 1], a === o - 1 && e >= u.t - r) {
                        c.h && (c = u), s = 0;
                        break;
                    }
                    if (u.t - r > e) {
                        s = a;
                        break;
                    }
                    a < o - 1 ? a += 1 : (s = 0, h = !1);
                }
                v = this.keyframesMetadata[a] || {};
                var C, d, S, _, g, T, x = u.t - r, E = c.t - r, y;
                if (c.to) {
                    v.bezierData || (v.bezierData = bez.buildBezierData(c.s, u.s || c.e, c.to, c.ti));
                    var b = v.bezierData;
                    if (e >= x || e < E) {
                        var w = e >= x ? b.points.length - 1 : 0;
                        for(d = b.points[w].point.length, C = 0; C < d; C += 1)i[C] = b.points[w].point[C];
                    } else {
                        v.__fnct ? T = v.__fnct : (T = BezierFactory.getBezierEasing(c.o.x, c.o.y, c.i.x, c.i.y, c.n).get, v.__fnct = T), S = T((e - E) / (x - E));
                        var j = b.segmentLength * S, M, I = t.lastFrame < e && t._lastKeyframeIndex === a ? t._lastAddedLength : 0;
                        for(g = t.lastFrame < e && t._lastKeyframeIndex === a ? t._lastPoint : 0, h = !0, _ = b.points.length; h;){
                            if (I += b.points[g].partialLength, j === 0 || S === 0 || g === b.points.length - 1) {
                                for(d = b.points[g].point.length, C = 0; C < d; C += 1)i[C] = b.points[g].point[C];
                                break;
                            } else if (j >= I && j < I + b.points[g + 1].partialLength) {
                                for(M = (j - I) / b.points[g + 1].partialLength, d = b.points[g].point.length, C = 0; C < d; C += 1)i[C] = b.points[g].point[C] + (b.points[g + 1].point[C] - b.points[g].point[C]) * M;
                                break;
                            }
                            g < _ - 1 ? g += 1 : h = !1;
                        }
                        t._lastPoint = g, t._lastAddedLength = I - b.points[g].partialLength, t._lastKeyframeIndex = a;
                    }
                } else {
                    var D, B, G, V, U;
                    if (o = c.s.length, y = u.s || c.e, this.sh && c.h !== 1) if (e >= x) i[0] = y[0], i[1] = y[1], i[2] = y[2];
                    else if (e <= E) i[0] = c.s[0], i[1] = c.s[1], i[2] = c.s[2];
                    else {
                        var W = createQuaternion(c.s), z = createQuaternion(y), A = (e - E) / (x - E);
                        quaternionToEuler(i, slerp(W, z, A));
                    }
                    else for(a = 0; a < o; a += 1)c.h !== 1 && (e >= x ? S = 1 : e < E ? S = 0 : (c.o.x.constructor === Array ? (v.__fnct || (v.__fnct = []), v.__fnct[a] ? T = v.__fnct[a] : (D = c.o.x[a] === void 0 ? c.o.x[0] : c.o.x[a], B = c.o.y[a] === void 0 ? c.o.y[0] : c.o.y[a], G = c.i.x[a] === void 0 ? c.i.x[0] : c.i.x[a], V = c.i.y[a] === void 0 ? c.i.y[0] : c.i.y[a], T = BezierFactory.getBezierEasing(D, B, G, V).get, v.__fnct[a] = T)) : v.__fnct ? T = v.__fnct : (D = c.o.x, B = c.o.y, G = c.i.x, V = c.i.y, T = BezierFactory.getBezierEasing(D, B, G, V).get, c.keyframeMetadata = T), S = T((e - E) / (x - E)))), y = u.s || c.e, U = c.h === 1 ? c.s[a] : c.s[a] + (y[a] - c.s[a]) * S, this.propType === "multidimensional" ? i[a] = U : i = U;
                }
                return t.lastIndex = s, i;
            }
            function slerp(e, t, r) {
                var i = [], s = e[0], a = e[1], o = e[2], h = e[3], c = t[0], u = t[1], v = t[2], C = t[3], d, S, _, g, T;
                return S = s * c + a * u + o * v + h * C, S < 0 && (S = -S, c = -c, u = -u, v = -v, C = -C), 1 - S > 1e-6 ? (d = Math.acos(S), _ = Math.sin(d), g = Math.sin((1 - r) * d) / _, T = Math.sin(r * d) / _) : (g = 1 - r, T = r), i[0] = g * s + T * c, i[1] = g * a + T * u, i[2] = g * o + T * v, i[3] = g * h + T * C, i;
            }
            function quaternionToEuler(e, t) {
                var r = t[0], i = t[1], s = t[2], a = t[3], o = Math.atan2(2 * i * a - 2 * r * s, 1 - 2 * i * i - 2 * s * s), h = Math.asin(2 * r * i + 2 * s * a), c = Math.atan2(2 * r * a - 2 * i * s, 1 - 2 * r * r - 2 * s * s);
                e[0] = o / degToRads, e[1] = h / degToRads, e[2] = c / degToRads;
            }
            function createQuaternion(e) {
                var t = e[0] * degToRads, r = e[1] * degToRads, i = e[2] * degToRads, s = Math.cos(t / 2), a = Math.cos(r / 2), o = Math.cos(i / 2), h = Math.sin(t / 2), c = Math.sin(r / 2), u = Math.sin(i / 2), v = s * a * o - h * c * u, C = h * c * o + s * a * u, d = h * a * o + s * c * u, S = s * c * o - h * a * u;
                return [
                    C,
                    d,
                    S,
                    v
                ];
            }
            function getValueAtCurrentTime() {
                var e = this.comp.renderedFrame - this.offsetTime, t = this.keyframes[0].t - this.offsetTime, r = this.keyframes[this.keyframes.length - 1].t - this.offsetTime;
                if (!(e === this._caching.lastFrame || this._caching.lastFrame !== initFrame && (this._caching.lastFrame >= r && e >= r || this._caching.lastFrame < t && e < t))) {
                    this._caching.lastFrame >= e && (this._caching._lastKeyframeIndex = -1, this._caching.lastIndex = 0);
                    var i = this.interpolateValue(e, this._caching);
                    this.pv = i;
                }
                return this._caching.lastFrame = e, this.pv;
            }
            function setVValue(e) {
                var t;
                if (this.propType === "unidimensional") t = e * this.mult, mathAbs(this.v - t) > 1e-5 && (this.v = t, this._mdf = !0);
                else for(var r = 0, i = this.v.length; r < i;)t = e[r] * this.mult, mathAbs(this.v[r] - t) > 1e-5 && (this.v[r] = t, this._mdf = !0), r += 1;
            }
            function processEffectsSequence() {
                if (!(this.elem.globalData.frameId === this.frameId || !this.effectsSequence.length)) {
                    if (this.lock) {
                        this.setVValue(this.pv);
                        return;
                    }
                    this.lock = !0, this._mdf = this._isFirstFrame;
                    var e, t = this.effectsSequence.length, r = this.kf ? this.pv : this.data.k;
                    for(e = 0; e < t; e += 1)r = this.effectsSequence[e](r);
                    this.setVValue(r), this._isFirstFrame = !1, this.lock = !1, this.frameId = this.elem.globalData.frameId;
                }
            }
            function addEffect(e) {
                this.effectsSequence.push(e), this.container.addDynamicProperty(this);
            }
            function ValueProperty(e, t, r, i) {
                this.propType = "unidimensional", this.mult = r || 1, this.data = t, this.v = r ? t.k * r : t.k, this.pv = t.k, this._mdf = !1, this.elem = e, this.container = i, this.comp = e.comp, this.k = !1, this.kf = !1, this.vel = 0, this.effectsSequence = [], this._isFirstFrame = !0, this.getValue = processEffectsSequence, this.setVValue = setVValue, this.addEffect = addEffect;
            }
            function MultiDimensionalProperty(e, t, r, i) {
                this.propType = "multidimensional", this.mult = r || 1, this.data = t, this._mdf = !1, this.elem = e, this.container = i, this.comp = e.comp, this.k = !1, this.kf = !1, this.frameId = -1;
                var s, a = t.k.length;
                for(this.v = createTypedArray("float32", a), this.pv = createTypedArray("float32", a), this.vel = createTypedArray("float32", a), s = 0; s < a; s += 1)this.v[s] = t.k[s] * this.mult, this.pv[s] = t.k[s];
                this._isFirstFrame = !0, this.effectsSequence = [], this.getValue = processEffectsSequence, this.setVValue = setVValue, this.addEffect = addEffect;
            }
            function KeyframedValueProperty(e, t, r, i) {
                this.propType = "unidimensional", this.keyframes = t.k, this.keyframesMetadata = [], this.offsetTime = e.data.st, this.frameId = -1, this._caching = {
                    lastFrame: initFrame,
                    lastIndex: 0,
                    value: 0,
                    _lastKeyframeIndex: -1
                }, this.k = !0, this.kf = !0, this.data = t, this.mult = r || 1, this.elem = e, this.container = i, this.comp = e.comp, this.v = initFrame, this.pv = initFrame, this._isFirstFrame = !0, this.getValue = processEffectsSequence, this.setVValue = setVValue, this.interpolateValue = interpolateValue, this.effectsSequence = [
                    getValueAtCurrentTime.bind(this)
                ], this.addEffect = addEffect;
            }
            function KeyframedMultidimensionalProperty(e, t, r, i) {
                this.propType = "multidimensional";
                var s, a = t.k.length, o, h, c, u;
                for(s = 0; s < a - 1; s += 1)t.k[s].to && t.k[s].s && t.k[s + 1] && t.k[s + 1].s && (o = t.k[s].s, h = t.k[s + 1].s, c = t.k[s].to, u = t.k[s].ti, (o.length === 2 && !(o[0] === h[0] && o[1] === h[1]) && bez.pointOnLine2D(o[0], o[1], h[0], h[1], o[0] + c[0], o[1] + c[1]) && bez.pointOnLine2D(o[0], o[1], h[0], h[1], h[0] + u[0], h[1] + u[1]) || o.length === 3 && !(o[0] === h[0] && o[1] === h[1] && o[2] === h[2]) && bez.pointOnLine3D(o[0], o[1], o[2], h[0], h[1], h[2], o[0] + c[0], o[1] + c[1], o[2] + c[2]) && bez.pointOnLine3D(o[0], o[1], o[2], h[0], h[1], h[2], h[0] + u[0], h[1] + u[1], h[2] + u[2])) && (t.k[s].to = null, t.k[s].ti = null), o[0] === h[0] && o[1] === h[1] && c[0] === 0 && c[1] === 0 && u[0] === 0 && u[1] === 0 && (o.length === 2 || o[2] === h[2] && c[2] === 0 && u[2] === 0) && (t.k[s].to = null, t.k[s].ti = null));
                this.effectsSequence = [
                    getValueAtCurrentTime.bind(this)
                ], this.data = t, this.keyframes = t.k, this.keyframesMetadata = [], this.offsetTime = e.data.st, this.k = !0, this.kf = !0, this._isFirstFrame = !0, this.mult = r || 1, this.elem = e, this.container = i, this.comp = e.comp, this.getValue = processEffectsSequence, this.setVValue = setVValue, this.interpolateValue = interpolateValue, this.frameId = -1;
                var v = t.k[0].s.length;
                for(this.v = createTypedArray("float32", v), this.pv = createTypedArray("float32", v), s = 0; s < v; s += 1)this.v[s] = initFrame, this.pv[s] = initFrame;
                this._caching = {
                    lastFrame: initFrame,
                    lastIndex: 0,
                    value: createTypedArray("float32", v)
                }, this.addEffect = addEffect;
            }
            var PropertyFactory = function() {
                function e(r, i, s, a, o) {
                    i.sid && (i = r.globalData.slotManager.getProp(i));
                    var h;
                    if (!i.k.length) h = new ValueProperty(r, i, a, o);
                    else if (typeof i.k[0] == "number") h = new MultiDimensionalProperty(r, i, a, o);
                    else switch(s){
                        case 0:
                            h = new KeyframedValueProperty(r, i, a, o);
                            break;
                        case 1:
                            h = new KeyframedMultidimensionalProperty(r, i, a, o);
                            break;
                    }
                    return h.effectsSequence.length && o.addDynamicProperty(h), h;
                }
                var t = {
                    getProp: e
                };
                return t;
            }();
            function DynamicPropertyContainer() {}
            DynamicPropertyContainer.prototype = {
                addDynamicProperty: function(t) {
                    this.dynamicProperties.indexOf(t) === -1 && (this.dynamicProperties.push(t), this.container.addDynamicProperty(this), this._isAnimated = !0);
                },
                iterateDynamicProperties: function() {
                    this._mdf = !1;
                    var t, r = this.dynamicProperties.length;
                    for(t = 0; t < r; t += 1)this.dynamicProperties[t].getValue(), this.dynamicProperties[t]._mdf && (this._mdf = !0);
                },
                initDynamicPropertyContainer: function(t) {
                    this.container = t, this.dynamicProperties = [], this._mdf = !1, this._isAnimated = !1;
                }
            };
            var pointPool = function() {
                function e() {
                    return createTypedArray("float32", 2);
                }
                return poolFactory(8, e);
            }();
            function ShapePath() {
                this.c = !1, this._length = 0, this._maxLength = 8, this.v = createSizedArray(this._maxLength), this.o = createSizedArray(this._maxLength), this.i = createSizedArray(this._maxLength);
            }
            ShapePath.prototype.setPathData = function(e, t) {
                this.c = e, this.setLength(t);
                for(var r = 0; r < t;)this.v[r] = pointPool.newElement(), this.o[r] = pointPool.newElement(), this.i[r] = pointPool.newElement(), r += 1;
            }, ShapePath.prototype.setLength = function(e) {
                for(; this._maxLength < e;)this.doubleArrayLength();
                this._length = e;
            }, ShapePath.prototype.doubleArrayLength = function() {
                this.v = this.v.concat(createSizedArray(this._maxLength)), this.i = this.i.concat(createSizedArray(this._maxLength)), this.o = this.o.concat(createSizedArray(this._maxLength)), this._maxLength *= 2;
            }, ShapePath.prototype.setXYAt = function(e, t, r, i, s) {
                var a;
                switch(this._length = Math.max(this._length, i + 1), this._length >= this._maxLength && this.doubleArrayLength(), r){
                    case "v":
                        a = this.v;
                        break;
                    case "i":
                        a = this.i;
                        break;
                    case "o":
                        a = this.o;
                        break;
                    default:
                        a = [];
                        break;
                }
                (!a[i] || a[i] && !s) && (a[i] = pointPool.newElement()), a[i][0] = e, a[i][1] = t;
            }, ShapePath.prototype.setTripleAt = function(e, t, r, i, s, a, o, h) {
                this.setXYAt(e, t, "v", o, h), this.setXYAt(r, i, "o", o, h), this.setXYAt(s, a, "i", o, h);
            }, ShapePath.prototype.reverse = function() {
                var e = new ShapePath;
                e.setPathData(this.c, this._length);
                var t = this.v, r = this.o, i = this.i, s = 0;
                this.c && (e.setTripleAt(t[0][0], t[0][1], i[0][0], i[0][1], r[0][0], r[0][1], 0, !1), s = 1);
                var a = this._length - 1, o = this._length, h;
                for(h = s; h < o; h += 1)e.setTripleAt(t[a][0], t[a][1], i[a][0], i[a][1], r[a][0], r[a][1], h, !1), a -= 1;
                return e;
            }, ShapePath.prototype.length = function() {
                return this._length;
            };
            var shapePool = function() {
                function e() {
                    return new ShapePath;
                }
                function t(s) {
                    var a = s._length, o;
                    for(o = 0; o < a; o += 1)pointPool.release(s.v[o]), pointPool.release(s.i[o]), pointPool.release(s.o[o]), s.v[o] = null, s.i[o] = null, s.o[o] = null;
                    s._length = 0, s.c = !1;
                }
                function r(s) {
                    var a = i.newElement(), o, h = s._length === void 0 ? s.v.length : s._length;
                    for(a.setLength(h), a.c = s.c, o = 0; o < h; o += 1)a.setTripleAt(s.v[o][0], s.v[o][1], s.o[o][0], s.o[o][1], s.i[o][0], s.i[o][1], o);
                    return a;
                }
                var i = poolFactory(4, e, t);
                return i.clone = r, i;
            }();
            function ShapeCollection() {
                this._length = 0, this._maxLength = 4, this.shapes = createSizedArray(this._maxLength);
            }
            ShapeCollection.prototype.addShape = function(e) {
                this._length === this._maxLength && (this.shapes = this.shapes.concat(createSizedArray(this._maxLength)), this._maxLength *= 2), this.shapes[this._length] = e, this._length += 1;
            }, ShapeCollection.prototype.releaseShapes = function() {
                var e;
                for(e = 0; e < this._length; e += 1)shapePool.release(this.shapes[e]);
                this._length = 0;
            };
            var shapeCollectionPool = function() {
                var e = {
                    newShapeCollection: s,
                    release: a
                }, t = 0, r = 4, i = createSizedArray(r);
                function s() {
                    var o;
                    return t ? (t -= 1, o = i[t]) : o = new ShapeCollection, o;
                }
                function a(o) {
                    var h, c = o._length;
                    for(h = 0; h < c; h += 1)shapePool.release(o.shapes[h]);
                    o._length = 0, t === r && (i = pooling.double(i), r *= 2), i[t] = o, t += 1;
                }
                return e;
            }(), ShapePropertyFactory = function() {
                var e = -999999;
                function t(x, E, y) {
                    var b = y.lastIndex, w, j, M, I, D, B, G, V, U, W = this.keyframes;
                    if (x < W[0].t - this.offsetTime) w = W[0].s[0], M = !0, b = 0;
                    else if (x >= W[W.length - 1].t - this.offsetTime) w = W[W.length - 1].s ? W[W.length - 1].s[0] : W[W.length - 2].e[0], M = !0;
                    else {
                        for(var z = b, A = W.length - 1, F = !0, P, R, L; F && (P = W[z], R = W[z + 1], !(R.t - this.offsetTime > x));)z < A - 1 ? z += 1 : F = !1;
                        if (L = this.keyframesMetadata[z] || {}, M = P.h === 1, b = z, !M) {
                            if (x >= R.t - this.offsetTime) V = 1;
                            else if (x < P.t - this.offsetTime) V = 0;
                            else {
                                var N;
                                L.__fnct ? N = L.__fnct : (N = BezierFactory.getBezierEasing(P.o.x, P.o.y, P.i.x, P.i.y).get, L.__fnct = N), V = N((x - (P.t - this.offsetTime)) / (R.t - this.offsetTime - (P.t - this.offsetTime)));
                            }
                            j = R.s ? R.s[0] : P.e[0];
                        }
                        w = P.s[0];
                    }
                    for(B = E._length, G = w.i[0].length, y.lastIndex = b, I = 0; I < B; I += 1)for(D = 0; D < G; D += 1)U = M ? w.i[I][D] : w.i[I][D] + (j.i[I][D] - w.i[I][D]) * V, E.i[I][D] = U, U = M ? w.o[I][D] : w.o[I][D] + (j.o[I][D] - w.o[I][D]) * V, E.o[I][D] = U, U = M ? w.v[I][D] : w.v[I][D] + (j.v[I][D] - w.v[I][D]) * V, E.v[I][D] = U;
                }
                function r() {
                    var x = this.comp.renderedFrame - this.offsetTime, E = this.keyframes[0].t - this.offsetTime, y = this.keyframes[this.keyframes.length - 1].t - this.offsetTime, b = this._caching.lastFrame;
                    return b !== e && (b < E && x < E || b > y && x > y) || (this._caching.lastIndex = b < x ? this._caching.lastIndex : 0, this.interpolateShape(x, this.pv, this._caching)), this._caching.lastFrame = x, this.pv;
                }
                function i() {
                    this.paths = this.localShapeCollection;
                }
                function s(x, E) {
                    if (x._length !== E._length || x.c !== E.c) return !1;
                    var y, b = x._length;
                    for(y = 0; y < b; y += 1)if (x.v[y][0] !== E.v[y][0] || x.v[y][1] !== E.v[y][1] || x.o[y][0] !== E.o[y][0] || x.o[y][1] !== E.o[y][1] || x.i[y][0] !== E.i[y][0] || x.i[y][1] !== E.i[y][1]) return !1;
                    return !0;
                }
                function a(x) {
                    s(this.v, x) || (this.v = shapePool.clone(x), this.localShapeCollection.releaseShapes(), this.localShapeCollection.addShape(this.v), this._mdf = !0, this.paths = this.localShapeCollection);
                }
                function o() {
                    if (this.elem.globalData.frameId !== this.frameId) {
                        if (!this.effectsSequence.length) {
                            this._mdf = !1;
                            return;
                        }
                        if (this.lock) {
                            this.setVValue(this.pv);
                            return;
                        }
                        this.lock = !0, this._mdf = !1;
                        var x;
                        this.kf ? x = this.pv : this.data.ks ? x = this.data.ks.k : x = this.data.pt.k;
                        var E, y = this.effectsSequence.length;
                        for(E = 0; E < y; E += 1)x = this.effectsSequence[E](x);
                        this.setVValue(x), this.lock = !1, this.frameId = this.elem.globalData.frameId;
                    }
                }
                function h(x, E, y) {
                    this.propType = "shape", this.comp = x.comp, this.container = x, this.elem = x, this.data = E, this.k = !1, this.kf = !1, this._mdf = !1;
                    var b = y === 3 ? E.pt.k : E.ks.k;
                    this.v = shapePool.clone(b), this.pv = shapePool.clone(this.v), this.localShapeCollection = shapeCollectionPool.newShapeCollection(), this.paths = this.localShapeCollection, this.paths.addShape(this.v), this.reset = i, this.effectsSequence = [];
                }
                function c(x) {
                    this.effectsSequence.push(x), this.container.addDynamicProperty(this);
                }
                h.prototype.interpolateShape = t, h.prototype.getValue = o, h.prototype.setVValue = a, h.prototype.addEffect = c;
                function u(x, E, y) {
                    this.propType = "shape", this.comp = x.comp, this.elem = x, this.container = x, this.offsetTime = x.data.st, this.keyframes = y === 3 ? E.pt.k : E.ks.k, this.keyframesMetadata = [], this.k = !0, this.kf = !0;
                    var b = this.keyframes[0].s[0].i.length;
                    this.v = shapePool.newElement(), this.v.setPathData(this.keyframes[0].s[0].c, b), this.pv = shapePool.clone(this.v), this.localShapeCollection = shapeCollectionPool.newShapeCollection(), this.paths = this.localShapeCollection, this.paths.addShape(this.v), this.lastFrame = e, this.reset = i, this._caching = {
                        lastFrame: e,
                        lastIndex: 0
                    }, this.effectsSequence = [
                        r.bind(this)
                    ];
                }
                u.prototype.getValue = o, u.prototype.interpolateShape = t, u.prototype.setVValue = a, u.prototype.addEffect = c;
                var v = function() {
                    var x = roundCorner;
                    function E(y, b) {
                        this.v = shapePool.newElement(), this.v.setPathData(!0, 4), this.localShapeCollection = shapeCollectionPool.newShapeCollection(), this.paths = this.localShapeCollection, this.localShapeCollection.addShape(this.v), this.d = b.d, this.elem = y, this.comp = y.comp, this.frameId = -1, this.initDynamicPropertyContainer(y), this.p = PropertyFactory.getProp(y, b.p, 1, 0, this), this.s = PropertyFactory.getProp(y, b.s, 1, 0, this), this.dynamicProperties.length ? this.k = !0 : (this.k = !1, this.convertEllToPath());
                    }
                    return E.prototype = {
                        reset: i,
                        getValue: function() {
                            this.elem.globalData.frameId !== this.frameId && (this.frameId = this.elem.globalData.frameId, this.iterateDynamicProperties(), this._mdf && this.convertEllToPath());
                        },
                        convertEllToPath: function() {
                            var b = this.p.v[0], w = this.p.v[1], j = this.s.v[0] / 2, M = this.s.v[1] / 2, I = this.d !== 3, D = this.v;
                            D.v[0][0] = b, D.v[0][1] = w - M, D.v[1][0] = I ? b + j : b - j, D.v[1][1] = w, D.v[2][0] = b, D.v[2][1] = w + M, D.v[3][0] = I ? b - j : b + j, D.v[3][1] = w, D.i[0][0] = I ? b - j * x : b + j * x, D.i[0][1] = w - M, D.i[1][0] = I ? b + j : b - j, D.i[1][1] = w - M * x, D.i[2][0] = I ? b + j * x : b - j * x, D.i[2][1] = w + M, D.i[3][0] = I ? b - j : b + j, D.i[3][1] = w + M * x, D.o[0][0] = I ? b + j * x : b - j * x, D.o[0][1] = w - M, D.o[1][0] = I ? b + j : b - j, D.o[1][1] = w + M * x, D.o[2][0] = I ? b - j * x : b + j * x, D.o[2][1] = w + M, D.o[3][0] = I ? b - j : b + j, D.o[3][1] = w - M * x;
                        }
                    }, extendPrototype([
                        DynamicPropertyContainer
                    ], E), E;
                }(), C = function() {
                    function x(E, y) {
                        this.v = shapePool.newElement(), this.v.setPathData(!0, 0), this.elem = E, this.comp = E.comp, this.data = y, this.frameId = -1, this.d = y.d, this.initDynamicPropertyContainer(E), y.sy === 1 ? (this.ir = PropertyFactory.getProp(E, y.ir, 0, 0, this), this.is = PropertyFactory.getProp(E, y.is, 0, .01, this), this.convertToPath = this.convertStarToPath) : this.convertToPath = this.convertPolygonToPath, this.pt = PropertyFactory.getProp(E, y.pt, 0, 0, this), this.p = PropertyFactory.getProp(E, y.p, 1, 0, this), this.r = PropertyFactory.getProp(E, y.r, 0, degToRads, this), this.or = PropertyFactory.getProp(E, y.or, 0, 0, this), this.os = PropertyFactory.getProp(E, y.os, 0, .01, this), this.localShapeCollection = shapeCollectionPool.newShapeCollection(), this.localShapeCollection.addShape(this.v), this.paths = this.localShapeCollection, this.dynamicProperties.length ? this.k = !0 : (this.k = !1, this.convertToPath());
                    }
                    return x.prototype = {
                        reset: i,
                        getValue: function() {
                            this.elem.globalData.frameId !== this.frameId && (this.frameId = this.elem.globalData.frameId, this.iterateDynamicProperties(), this._mdf && this.convertToPath());
                        },
                        convertStarToPath: function() {
                            var y = Math.floor(this.pt.v) * 2, b = Math.PI * 2 / y, w = !0, j = this.or.v, M = this.ir.v, I = this.os.v, D = this.is.v, B = 2 * Math.PI * j / (y * 2), G = 2 * Math.PI * M / (y * 2), V, U, W, z, A = -Math.PI / 2;
                            A += this.r.v;
                            var F = this.data.d === 3 ? -1 : 1;
                            for(this.v._length = 0, V = 0; V < y; V += 1){
                                U = w ? j : M, W = w ? I : D, z = w ? B : G;
                                var P = U * Math.cos(A), R = U * Math.sin(A), L = P === 0 && R === 0 ? 0 : R / Math.sqrt(P * P + R * R), N = P === 0 && R === 0 ? 0 : -P / Math.sqrt(P * P + R * R);
                                P += +this.p.v[0], R += +this.p.v[1], this.v.setTripleAt(P, R, P - L * z * W * F, R - N * z * W * F, P + L * z * W * F, R + N * z * W * F, V, !0), w = !w, A += b * F;
                            }
                        },
                        convertPolygonToPath: function() {
                            var y = Math.floor(this.pt.v), b = Math.PI * 2 / y, w = this.or.v, j = this.os.v, M = 2 * Math.PI * w / (y * 4), I, D = -Math.PI * .5, B = this.data.d === 3 ? -1 : 1;
                            for(D += this.r.v, this.v._length = 0, I = 0; I < y; I += 1){
                                var G = w * Math.cos(D), V = w * Math.sin(D), U = G === 0 && V === 0 ? 0 : V / Math.sqrt(G * G + V * V), W = G === 0 && V === 0 ? 0 : -G / Math.sqrt(G * G + V * V);
                                G += +this.p.v[0], V += +this.p.v[1], this.v.setTripleAt(G, V, G - U * M * j * B, V - W * M * j * B, G + U * M * j * B, V + W * M * j * B, I, !0), D += b * B;
                            }
                            this.paths.length = 0, this.paths[0] = this.v;
                        }
                    }, extendPrototype([
                        DynamicPropertyContainer
                    ], x), x;
                }(), d = function() {
                    function x(E, y) {
                        this.v = shapePool.newElement(), this.v.c = !0, this.localShapeCollection = shapeCollectionPool.newShapeCollection(), this.localShapeCollection.addShape(this.v), this.paths = this.localShapeCollection, this.elem = E, this.comp = E.comp, this.frameId = -1, this.d = y.d, this.initDynamicPropertyContainer(E), this.p = PropertyFactory.getProp(E, y.p, 1, 0, this), this.s = PropertyFactory.getProp(E, y.s, 1, 0, this), this.r = PropertyFactory.getProp(E, y.r, 0, 0, this), this.dynamicProperties.length ? this.k = !0 : (this.k = !1, this.convertRectToPath());
                    }
                    return x.prototype = {
                        convertRectToPath: function() {
                            var y = this.p.v[0], b = this.p.v[1], w = this.s.v[0] / 2, j = this.s.v[1] / 2, M = bmMin(w, j, this.r.v), I = M * (1 - roundCorner);
                            this.v._length = 0, this.d === 2 || this.d === 1 ? (this.v.setTripleAt(y + w, b - j + M, y + w, b - j + M, y + w, b - j + I, 0, !0), this.v.setTripleAt(y + w, b + j - M, y + w, b + j - I, y + w, b + j - M, 1, !0), M !== 0 ? (this.v.setTripleAt(y + w - M, b + j, y + w - M, b + j, y + w - I, b + j, 2, !0), this.v.setTripleAt(y - w + M, b + j, y - w + I, b + j, y - w + M, b + j, 3, !0), this.v.setTripleAt(y - w, b + j - M, y - w, b + j - M, y - w, b + j - I, 4, !0), this.v.setTripleAt(y - w, b - j + M, y - w, b - j + I, y - w, b - j + M, 5, !0), this.v.setTripleAt(y - w + M, b - j, y - w + M, b - j, y - w + I, b - j, 6, !0), this.v.setTripleAt(y + w - M, b - j, y + w - I, b - j, y + w - M, b - j, 7, !0)) : (this.v.setTripleAt(y - w, b + j, y - w + I, b + j, y - w, b + j, 2), this.v.setTripleAt(y - w, b - j, y - w, b - j + I, y - w, b - j, 3))) : (this.v.setTripleAt(y + w, b - j + M, y + w, b - j + I, y + w, b - j + M, 0, !0), M !== 0 ? (this.v.setTripleAt(y + w - M, b - j, y + w - M, b - j, y + w - I, b - j, 1, !0), this.v.setTripleAt(y - w + M, b - j, y - w + I, b - j, y - w + M, b - j, 2, !0), this.v.setTripleAt(y - w, b - j + M, y - w, b - j + M, y - w, b - j + I, 3, !0), this.v.setTripleAt(y - w, b + j - M, y - w, b + j - I, y - w, b + j - M, 4, !0), this.v.setTripleAt(y - w + M, b + j, y - w + M, b + j, y - w + I, b + j, 5, !0), this.v.setTripleAt(y + w - M, b + j, y + w - I, b + j, y + w - M, b + j, 6, !0), this.v.setTripleAt(y + w, b + j - M, y + w, b + j - M, y + w, b + j - I, 7, !0)) : (this.v.setTripleAt(y - w, b - j, y - w + I, b - j, y - w, b - j, 1, !0), this.v.setTripleAt(y - w, b + j, y - w, b + j - I, y - w, b + j, 2, !0), this.v.setTripleAt(y + w, b + j, y + w - I, b + j, y + w, b + j, 3, !0)));
                        },
                        getValue: function() {
                            this.elem.globalData.frameId !== this.frameId && (this.frameId = this.elem.globalData.frameId, this.iterateDynamicProperties(), this._mdf && this.convertRectToPath());
                        },
                        reset: i
                    }, extendPrototype([
                        DynamicPropertyContainer
                    ], x), x;
                }();
                function S(x, E, y) {
                    var b;
                    if (y === 3 || y === 4) {
                        var w = y === 3 ? E.pt : E.ks, j = w.k;
                        j.length ? b = new u(x, E, y) : b = new h(x, E, y);
                    } else y === 5 ? b = new d(x, E) : y === 6 ? b = new v(x, E) : y === 7 && (b = new C(x, E));
                    return b.k && x.addDynamicProperty(b), b;
                }
                function _() {
                    return h;
                }
                function g() {
                    return u;
                }
                var T = {};
                return T.getShapeProp = S, T.getConstructorFunction = _, T.getKeyframedConstructorFunction = g, T;
            }();
            var Matrix = function() {
                var e = Math.cos, t = Math.sin, r = Math.tan, i = Math.round;
                function s() {
                    return this.props[0] = 1, this.props[1] = 0, this.props[2] = 0, this.props[3] = 0, this.props[4] = 0, this.props[5] = 1, this.props[6] = 0, this.props[7] = 0, this.props[8] = 0, this.props[9] = 0, this.props[10] = 1, this.props[11] = 0, this.props[12] = 0, this.props[13] = 0, this.props[14] = 0, this.props[15] = 1, this;
                }
                function a(P) {
                    if (P === 0) return this;
                    var R = e(P), L = t(P);
                    return this._t(R, -L, 0, 0, L, R, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
                }
                function o(P) {
                    if (P === 0) return this;
                    var R = e(P), L = t(P);
                    return this._t(1, 0, 0, 0, 0, R, -L, 0, 0, L, R, 0, 0, 0, 0, 1);
                }
                function h(P) {
                    if (P === 0) return this;
                    var R = e(P), L = t(P);
                    return this._t(R, 0, L, 0, 0, 1, 0, 0, -L, 0, R, 0, 0, 0, 0, 1);
                }
                function c(P) {
                    if (P === 0) return this;
                    var R = e(P), L = t(P);
                    return this._t(R, -L, 0, 0, L, R, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
                }
                function u(P, R) {
                    return this._t(1, R, P, 1, 0, 0);
                }
                function v(P, R) {
                    return this.shear(r(P), r(R));
                }
                function C(P, R) {
                    var L = e(R), N = t(R);
                    return this._t(L, N, 0, 0, -N, L, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)._t(1, 0, 0, 0, r(P), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)._t(L, -N, 0, 0, N, L, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
                }
                function d(P, R, L) {
                    return !L && L !== 0 && (L = 1), P === 1 && R === 1 && L === 1 ? this : this._t(P, 0, 0, 0, 0, R, 0, 0, 0, 0, L, 0, 0, 0, 0, 1);
                }
                function S(P, R, L, N, $, O, H, Y, Z, ee, re, ne, ie, J, te, Q) {
                    return this.props[0] = P, this.props[1] = R, this.props[2] = L, this.props[3] = N, this.props[4] = $, this.props[5] = O, this.props[6] = H, this.props[7] = Y, this.props[8] = Z, this.props[9] = ee, this.props[10] = re, this.props[11] = ne, this.props[12] = ie, this.props[13] = J, this.props[14] = te, this.props[15] = Q, this;
                }
                function _(P, R, L) {
                    return L = L || 0, P !== 0 || R !== 0 || L !== 0 ? this._t(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, P, R, L, 1) : this;
                }
                function g(P, R, L, N, $, O, H, Y, Z, ee, re, ne, ie, J, te, Q) {
                    var K = this.props;
                    if (P === 1 && R === 0 && L === 0 && N === 0 && $ === 0 && O === 1 && H === 0 && Y === 0 && Z === 0 && ee === 0 && re === 1 && ne === 0) return K[12] = K[12] * P + K[15] * ie, K[13] = K[13] * O + K[15] * J, K[14] = K[14] * re + K[15] * te, K[15] *= Q, this._identityCalculated = !1, this;
                    var ce = K[0], ue = K[1], he = K[2], le = K[3], pe = K[4], fe = K[5], se = K[6], de = K[7], me = K[8], ae = K[9], ve = K[10], oe = K[11], ge = K[12], ye = K[13], xe = K[14], _e = K[15];
                    return K[0] = ce * P + ue * $ + he * Z + le * ie, K[1] = ce * R + ue * O + he * ee + le * J, K[2] = ce * L + ue * H + he * re + le * te, K[3] = ce * N + ue * Y + he * ne + le * Q, K[4] = pe * P + fe * $ + se * Z + de * ie, K[5] = pe * R + fe * O + se * ee + de * J, K[6] = pe * L + fe * H + se * re + de * te, K[7] = pe * N + fe * Y + se * ne + de * Q, K[8] = me * P + ae * $ + ve * Z + oe * ie, K[9] = me * R + ae * O + ve * ee + oe * J, K[10] = me * L + ae * H + ve * re + oe * te, K[11] = me * N + ae * Y + ve * ne + oe * Q, K[12] = ge * P + ye * $ + xe * Z + _e * ie, K[13] = ge * R + ye * O + xe * ee + _e * J, K[14] = ge * L + ye * H + xe * re + _e * te, K[15] = ge * N + ye * Y + xe * ne + _e * Q, this._identityCalculated = !1, this;
                }
                function T(P) {
                    var R = P.props;
                    return this.transform(R[0], R[1], R[2], R[3], R[4], R[5], R[6], R[7], R[8], R[9], R[10], R[11], R[12], R[13], R[14], R[15]);
                }
                function x() {
                    return this._identityCalculated || (this._identity = !(this.props[0] !== 1 || this.props[1] !== 0 || this.props[2] !== 0 || this.props[3] !== 0 || this.props[4] !== 0 || this.props[5] !== 1 || this.props[6] !== 0 || this.props[7] !== 0 || this.props[8] !== 0 || this.props[9] !== 0 || this.props[10] !== 1 || this.props[11] !== 0 || this.props[12] !== 0 || this.props[13] !== 0 || this.props[14] !== 0 || this.props[15] !== 1), this._identityCalculated = !0), this._identity;
                }
                function E(P) {
                    for(var R = 0; R < 16;){
                        if (P.props[R] !== this.props[R]) return !1;
                        R += 1;
                    }
                    return !0;
                }
                function y(P) {
                    var R;
                    for(R = 0; R < 16; R += 1)P.props[R] = this.props[R];
                    return P;
                }
                function b(P) {
                    var R;
                    for(R = 0; R < 16; R += 1)this.props[R] = P[R];
                }
                function w(P, R, L) {
                    return {
                        x: P * this.props[0] + R * this.props[4] + L * this.props[8] + this.props[12],
                        y: P * this.props[1] + R * this.props[5] + L * this.props[9] + this.props[13],
                        z: P * this.props[2] + R * this.props[6] + L * this.props[10] + this.props[14]
                    };
                }
                function j(P, R, L) {
                    return P * this.props[0] + R * this.props[4] + L * this.props[8] + this.props[12];
                }
                function M(P, R, L) {
                    return P * this.props[1] + R * this.props[5] + L * this.props[9] + this.props[13];
                }
                function I(P, R, L) {
                    return P * this.props[2] + R * this.props[6] + L * this.props[10] + this.props[14];
                }
                function D() {
                    var P = this.props[0] * this.props[5] - this.props[1] * this.props[4], R = this.props[5] / P, L = -this.props[1] / P, N = -this.props[4] / P, $ = this.props[0] / P, O = (this.props[4] * this.props[13] - this.props[5] * this.props[12]) / P, H = -(this.props[0] * this.props[13] - this.props[1] * this.props[12]) / P, Y = new Matrix;
                    return Y.props[0] = R, Y.props[1] = L, Y.props[4] = N, Y.props[5] = $, Y.props[12] = O, Y.props[13] = H, Y;
                }
                function B(P) {
                    var R = this.getInverseMatrix();
                    return R.applyToPointArray(P[0], P[1], P[2] || 0);
                }
                function G(P) {
                    var R, L = P.length, N = [];
                    for(R = 0; R < L; R += 1)N[R] = B(P[R]);
                    return N;
                }
                function V(P, R, L) {
                    var N = createTypedArray("float32", 6);
                    if (this.isIdentity()) N[0] = P[0], N[1] = P[1], N[2] = R[0], N[3] = R[1], N[4] = L[0], N[5] = L[1];
                    else {
                        var $ = this.props[0], O = this.props[1], H = this.props[4], Y = this.props[5], Z = this.props[12], ee = this.props[13];
                        N[0] = P[0] * $ + P[1] * H + Z, N[1] = P[0] * O + P[1] * Y + ee, N[2] = R[0] * $ + R[1] * H + Z, N[3] = R[0] * O + R[1] * Y + ee, N[4] = L[0] * $ + L[1] * H + Z, N[5] = L[0] * O + L[1] * Y + ee;
                    }
                    return N;
                }
                function U(P, R, L) {
                    var N;
                    return this.isIdentity() ? N = [
                        P,
                        R,
                        L
                    ] : N = [
                        P * this.props[0] + R * this.props[4] + L * this.props[8] + this.props[12],
                        P * this.props[1] + R * this.props[5] + L * this.props[9] + this.props[13],
                        P * this.props[2] + R * this.props[6] + L * this.props[10] + this.props[14]
                    ], N;
                }
                function W(P, R) {
                    if (this.isIdentity()) return P + "," + R;
                    var L = this.props;
                    return Math.round((P * L[0] + R * L[4] + L[12]) * 100) / 100 + "," + Math.round((P * L[1] + R * L[5] + L[13]) * 100) / 100;
                }
                function z() {
                    for(var P = 0, R = this.props, L = "matrix3d(", N = 1e4; P < 16;)L += i(R[P] * N) / N, L += P === 15 ? ")" : ",", P += 1;
                    return L;
                }
                function A(P) {
                    var R = 1e4;
                    return P < 1e-6 && P > 0 || P > -1e-6 && P < 0 ? i(P * R) / R : P;
                }
                function F() {
                    var P = this.props, R = A(P[0]), L = A(P[1]), N = A(P[4]), $ = A(P[5]), O = A(P[12]), H = A(P[13]);
                    return "matrix(" + R + "," + L + "," + N + "," + $ + "," + O + "," + H + ")";
                }
                return function() {
                    this.reset = s, this.rotate = a, this.rotateX = o, this.rotateY = h, this.rotateZ = c, this.skew = v, this.skewFromAxis = C, this.shear = u, this.scale = d, this.setTransform = S, this.translate = _, this.transform = g, this.multiply = T, this.applyToPoint = w, this.applyToX = j, this.applyToY = M, this.applyToZ = I, this.applyToPointArray = U, this.applyToTriplePoints = V, this.applyToPointStringified = W, this.toCSS = z, this.to2dCSS = F, this.clone = y, this.cloneFromProps = b, this.equals = E, this.inversePoints = G, this.inversePoint = B, this.getInverseMatrix = D, this._t = this.transform, this.isIdentity = x, this._identity = !0, this._identityCalculated = !1, this.props = createTypedArray("float32", 16), this.reset();
                };
            }();
            function _typeof$3(e) {
                "@babel/helpers - typeof";
                return _typeof$3 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$3(e);
            }
            var lottie = {};
            function setLocation(e) {
                setLocationHref(e);
            }
            function searchAnimations() {
                animationManager.searchAnimations();
            }
            function setSubframeRendering(e) {
                setSubframeEnabled(e);
            }
            function setPrefix(e) {
                setIdPrefix(e);
            }
            function loadAnimation(e) {
                return animationManager.loadAnimation(e);
            }
            function setQuality(e) {
                if (typeof e == "string") switch(e){
                    case "high":
                        setDefaultCurveSegments(200);
                        break;
                    default:
                    case "medium":
                        setDefaultCurveSegments(50);
                        break;
                    case "low":
                        setDefaultCurveSegments(10);
                        break;
                }
                else !isNaN(e) && e > 1 && setDefaultCurveSegments(e);
            }
            function inBrowser() {
                return typeof navigator < "u";
            }
            function installPlugin(e, t) {
                e === "expressions" && setExpressionsPlugin(t);
            }
            function getFactory(e) {
                switch(e){
                    case "propertyFactory":
                        return PropertyFactory;
                    case "shapePropertyFactory":
                        return ShapePropertyFactory;
                    case "matrix":
                        return Matrix;
                    default:
                        return null;
                }
            }
            lottie.play = animationManager.play, lottie.pause = animationManager.pause, lottie.setLocationHref = setLocation, lottie.togglePause = animationManager.togglePause, lottie.setSpeed = animationManager.setSpeed, lottie.setDirection = animationManager.setDirection, lottie.stop = animationManager.stop, lottie.searchAnimations = searchAnimations, lottie.registerAnimation = animationManager.registerAnimation, lottie.loadAnimation = loadAnimation, lottie.setSubframeRendering = setSubframeRendering, lottie.resize = animationManager.resize, lottie.goToAndStop = animationManager.goToAndStop, lottie.destroy = animationManager.destroy, lottie.setQuality = setQuality, lottie.inBrowser = inBrowser, lottie.installPlugin = installPlugin, lottie.freeze = animationManager.freeze, lottie.unfreeze = animationManager.unfreeze, lottie.setVolume = animationManager.setVolume, lottie.mute = animationManager.mute, lottie.unmute = animationManager.unmute, lottie.getRegisteredAnimations = animationManager.getRegisteredAnimations, lottie.useWebWorker = setWebWorker, lottie.setIDPrefix = setPrefix, lottie.__getFactory = getFactory, lottie.version = "5.13.0";
            function checkReady() {
                document.readyState === "complete" && (clearInterval(readyStateCheckInterval), searchAnimations());
            }
            function getQueryVariable(e) {
                for(var t = queryString.split("&"), r = 0; r < t.length; r += 1){
                    var i = t[r].split("=");
                    if (decodeURIComponent(i[0]) == e) return decodeURIComponent(i[1]);
                }
                return null;
            }
            var queryString = "";
            {
                var scripts = document.getElementsByTagName("script"), index = scripts.length - 1, myScript = scripts[index] || {
                    src: ""
                };
                queryString = myScript.src ? myScript.src.replace(/^[^\?]+\??/, "") : "", getQueryVariable("renderer");
            }
            var readyStateCheckInterval = setInterval(checkReady, 100);
            try {
                _typeof$3(exports$1) !== "object" && (window.bodymovin = lottie);
            } catch (e) {}
            var ShapeModifiers = function() {
                var e = {}, t = {};
                e.registerModifier = r, e.getModifier = i;
                function r(s, a) {
                    t[s] || (t[s] = a);
                }
                function i(s, a, o) {
                    return new t[s](a, o);
                }
                return e;
            }();
            function ShapeModifier() {}
            ShapeModifier.prototype.initModifierProperties = function() {}, ShapeModifier.prototype.addShapeToModifier = function() {}, ShapeModifier.prototype.addShape = function(e) {
                if (!this.closed) {
                    e.sh.container.addDynamicProperty(e.sh);
                    var t = {
                        shape: e.sh,
                        data: e,
                        localShapeCollection: shapeCollectionPool.newShapeCollection()
                    };
                    this.shapes.push(t), this.addShapeToModifier(t), this._isAnimated && e.setAsAnimated();
                }
            }, ShapeModifier.prototype.init = function(e, t) {
                this.shapes = [], this.elem = e, this.initDynamicPropertyContainer(e), this.initModifierProperties(e, t), this.frameId = initialDefaultFrame, this.closed = !1, this.k = !1, this.dynamicProperties.length ? this.k = !0 : this.getValue(!0);
            }, ShapeModifier.prototype.processKeys = function() {
                this.elem.globalData.frameId !== this.frameId && (this.frameId = this.elem.globalData.frameId, this.iterateDynamicProperties());
            }, extendPrototype([
                DynamicPropertyContainer
            ], ShapeModifier);
            function TrimModifier() {}
            extendPrototype([
                ShapeModifier
            ], TrimModifier), TrimModifier.prototype.initModifierProperties = function(e, t) {
                this.s = PropertyFactory.getProp(e, t.s, 0, .01, this), this.e = PropertyFactory.getProp(e, t.e, 0, .01, this), this.o = PropertyFactory.getProp(e, t.o, 0, 0, this), this.sValue = 0, this.eValue = 0, this.getValue = this.processKeys, this.m = t.m, this._isAnimated = !!this.s.effectsSequence.length || !!this.e.effectsSequence.length || !!this.o.effectsSequence.length;
            }, TrimModifier.prototype.addShapeToModifier = function(e) {
                e.pathsData = [];
            }, TrimModifier.prototype.calculateShapeEdges = function(e, t, r, i, s) {
                var a = [];
                t <= 1 ? a.push({
                    s: e,
                    e: t
                }) : e >= 1 ? a.push({
                    s: e - 1,
                    e: t - 1
                }) : (a.push({
                    s: e,
                    e: 1
                }), a.push({
                    s: 0,
                    e: t - 1
                }));
                var o = [], h, c = a.length, u;
                for(h = 0; h < c; h += 1)if (u = a[h], !(u.e * s < i || u.s * s > i + r)) {
                    var v, C;
                    u.s * s <= i ? v = 0 : v = (u.s * s - i) / r, u.e * s >= i + r ? C = 1 : C = (u.e * s - i) / r, o.push([
                        v,
                        C
                    ]);
                }
                return o.length || o.push([
                    0,
                    0
                ]), o;
            }, TrimModifier.prototype.releasePathsData = function(e) {
                var t, r = e.length;
                for(t = 0; t < r; t += 1)segmentsLengthPool.release(e[t]);
                return e.length = 0, e;
            }, TrimModifier.prototype.processShapes = function(e) {
                var t, r;
                if (this._mdf || e) {
                    var i = this.o.v % 360 / 360;
                    if (i < 0 && (i += 1), this.s.v > 1 ? t = 1 + i : this.s.v < 0 ? t = 0 + i : t = this.s.v + i, this.e.v > 1 ? r = 1 + i : this.e.v < 0 ? r = 0 + i : r = this.e.v + i, t > r) {
                        var s = t;
                        t = r, r = s;
                    }
                    t = Math.round(t * 1e4) * 1e-4, r = Math.round(r * 1e4) * 1e-4, this.sValue = t, this.eValue = r;
                } else t = this.sValue, r = this.eValue;
                var a, o, h = this.shapes.length, c, u, v, C, d, S = 0;
                if (r === t) for(o = 0; o < h; o += 1)this.shapes[o].localShapeCollection.releaseShapes(), this.shapes[o].shape._mdf = !0, this.shapes[o].shape.paths = this.shapes[o].localShapeCollection, this._mdf && (this.shapes[o].pathsData.length = 0);
                else if (r === 1 && t === 0 || r === 0 && t === 1) {
                    if (this._mdf) for(o = 0; o < h; o += 1)this.shapes[o].pathsData.length = 0, this.shapes[o].shape._mdf = !0;
                } else {
                    var _ = [], g, T;
                    for(o = 0; o < h; o += 1)if (g = this.shapes[o], !g.shape._mdf && !this._mdf && !e && this.m !== 2) g.shape.paths = g.localShapeCollection;
                    else {
                        if (a = g.shape.paths, u = a._length, d = 0, !g.shape._mdf && g.pathsData.length) d = g.totalShapeLength;
                        else {
                            for(v = this.releasePathsData(g.pathsData), c = 0; c < u; c += 1)C = bez.getSegmentsLength(a.shapes[c]), v.push(C), d += C.totalLength;
                            g.totalShapeLength = d, g.pathsData = v;
                        }
                        S += d, g.shape._mdf = !0;
                    }
                    var x = t, E = r, y = 0, b;
                    for(o = h - 1; o >= 0; o -= 1)if (g = this.shapes[o], g.shape._mdf) {
                        for(T = g.localShapeCollection, T.releaseShapes(), this.m === 2 && h > 1 ? (b = this.calculateShapeEdges(t, r, g.totalShapeLength, y, S), y += g.totalShapeLength) : b = [
                            [
                                x,
                                E
                            ]
                        ], u = b.length, c = 0; c < u; c += 1){
                            x = b[c][0], E = b[c][1], _.length = 0, E <= 1 ? _.push({
                                s: g.totalShapeLength * x,
                                e: g.totalShapeLength * E
                            }) : x >= 1 ? _.push({
                                s: g.totalShapeLength * (x - 1),
                                e: g.totalShapeLength * (E - 1)
                            }) : (_.push({
                                s: g.totalShapeLength * x,
                                e: g.totalShapeLength
                            }), _.push({
                                s: 0,
                                e: g.totalShapeLength * (E - 1)
                            }));
                            var w = this.addShapes(g, _[0]);
                            if (_[0].s !== _[0].e) {
                                if (_.length > 1) {
                                    var j = g.shape.paths.shapes[g.shape.paths._length - 1];
                                    if (j.c) {
                                        var M = w.pop();
                                        this.addPaths(w, T), w = this.addShapes(g, _[1], M);
                                    } else this.addPaths(w, T), w = this.addShapes(g, _[1]);
                                }
                                this.addPaths(w, T);
                            }
                        }
                        g.shape.paths = T;
                    }
                }
            }, TrimModifier.prototype.addPaths = function(e, t) {
                var r, i = e.length;
                for(r = 0; r < i; r += 1)t.addShape(e[r]);
            }, TrimModifier.prototype.addSegment = function(e, t, r, i, s, a, o) {
                s.setXYAt(t[0], t[1], "o", a), s.setXYAt(r[0], r[1], "i", a + 1), o && s.setXYAt(e[0], e[1], "v", a), s.setXYAt(i[0], i[1], "v", a + 1);
            }, TrimModifier.prototype.addSegmentFromArray = function(e, t, r, i) {
                t.setXYAt(e[1], e[5], "o", r), t.setXYAt(e[2], e[6], "i", r + 1), i && t.setXYAt(e[0], e[4], "v", r), t.setXYAt(e[3], e[7], "v", r + 1);
            }, TrimModifier.prototype.addShapes = function(e, t, r) {
                var i = e.pathsData, s = e.shape.paths.shapes, a, o = e.shape.paths._length, h, c, u = 0, v, C, d, S, _ = [], g, T = !0;
                for(r ? (C = r._length, g = r._length) : (r = shapePool.newElement(), C = 0, g = 0), _.push(r), a = 0; a < o; a += 1){
                    for(d = i[a].lengths, r.c = s[a].c, c = s[a].c ? d.length : d.length + 1, h = 1; h < c; h += 1)if (v = d[h - 1], u + v.addedLength < t.s) u += v.addedLength, r.c = !1;
                    else if (u > t.e) {
                        r.c = !1;
                        break;
                    } else t.s <= u && t.e >= u + v.addedLength ? (this.addSegment(s[a].v[h - 1], s[a].o[h - 1], s[a].i[h], s[a].v[h], r, C, T), T = !1) : (S = bez.getNewSegment(s[a].v[h - 1], s[a].v[h], s[a].o[h - 1], s[a].i[h], (t.s - u) / v.addedLength, (t.e - u) / v.addedLength, d[h - 1]), this.addSegmentFromArray(S, r, C, T), T = !1, r.c = !1), u += v.addedLength, C += 1;
                    if (s[a].c && d.length) {
                        if (v = d[h - 1], u <= t.e) {
                            var x = d[h - 1].addedLength;
                            t.s <= u && t.e >= u + x ? (this.addSegment(s[a].v[h - 1], s[a].o[h - 1], s[a].i[0], s[a].v[0], r, C, T), T = !1) : (S = bez.getNewSegment(s[a].v[h - 1], s[a].v[0], s[a].o[h - 1], s[a].i[0], (t.s - u) / x, (t.e - u) / x, d[h - 1]), this.addSegmentFromArray(S, r, C, T), T = !1, r.c = !1);
                        } else r.c = !1;
                        u += v.addedLength, C += 1;
                    }
                    if (r._length && (r.setXYAt(r.v[g][0], r.v[g][1], "i", g), r.setXYAt(r.v[r._length - 1][0], r.v[r._length - 1][1], "o", r._length - 1)), u > t.e) break;
                    a < o - 1 && (r = shapePool.newElement(), T = !0, _.push(r), C = 0);
                }
                return _;
            };
            function PuckerAndBloatModifier() {}
            extendPrototype([
                ShapeModifier
            ], PuckerAndBloatModifier), PuckerAndBloatModifier.prototype.initModifierProperties = function(e, t) {
                this.getValue = this.processKeys, this.amount = PropertyFactory.getProp(e, t.a, 0, null, this), this._isAnimated = !!this.amount.effectsSequence.length;
            }, PuckerAndBloatModifier.prototype.processPath = function(e, t) {
                var r = t / 100, i = [
                    0,
                    0
                ], s = e._length, a = 0;
                for(a = 0; a < s; a += 1)i[0] += e.v[a][0], i[1] += e.v[a][1];
                i[0] /= s, i[1] /= s;
                var o = shapePool.newElement();
                o.c = e.c;
                var h, c, u, v, C, d;
                for(a = 0; a < s; a += 1)h = e.v[a][0] + (i[0] - e.v[a][0]) * r, c = e.v[a][1] + (i[1] - e.v[a][1]) * r, u = e.o[a][0] + (i[0] - e.o[a][0]) * -r, v = e.o[a][1] + (i[1] - e.o[a][1]) * -r, C = e.i[a][0] + (i[0] - e.i[a][0]) * -r, d = e.i[a][1] + (i[1] - e.i[a][1]) * -r, o.setTripleAt(h, c, u, v, C, d, a);
                return o;
            }, PuckerAndBloatModifier.prototype.processShapes = function(e) {
                var t, r, i = this.shapes.length, s, a, o = this.amount.v;
                if (o !== 0) {
                    var h, c;
                    for(r = 0; r < i; r += 1){
                        if (h = this.shapes[r], c = h.localShapeCollection, !(!h.shape._mdf && !this._mdf && !e)) for(c.releaseShapes(), h.shape._mdf = !0, t = h.shape.paths.shapes, a = h.shape.paths._length, s = 0; s < a; s += 1)c.addShape(this.processPath(t[s], o));
                        h.shape.paths = h.localShapeCollection;
                    }
                }
                this.dynamicProperties.length || (this._mdf = !1);
            };
            var TransformPropertyFactory = function() {
                var e = [
                    0,
                    0
                ];
                function t(c) {
                    var u = this._mdf;
                    this.iterateDynamicProperties(), this._mdf = this._mdf || u, this.a && c.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]), this.s && c.scale(this.s.v[0], this.s.v[1], this.s.v[2]), this.sk && c.skewFromAxis(-this.sk.v, this.sa.v), this.r ? c.rotate(-this.r.v) : c.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]), this.data.p.s ? this.data.p.z ? c.translate(this.px.v, this.py.v, -this.pz.v) : c.translate(this.px.v, this.py.v, 0) : c.translate(this.p.v[0], this.p.v[1], -this.p.v[2]);
                }
                function r(c) {
                    if (this.elem.globalData.frameId !== this.frameId) {
                        if (this._isDirty && (this.precalculateMatrix(), this._isDirty = !1), this.iterateDynamicProperties(), this._mdf || c) {
                            var u;
                            if (this.v.cloneFromProps(this.pre.props), this.appliedTransformations < 1 && this.v.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]), this.appliedTransformations < 2 && this.v.scale(this.s.v[0], this.s.v[1], this.s.v[2]), this.sk && this.appliedTransformations < 3 && this.v.skewFromAxis(-this.sk.v, this.sa.v), this.r && this.appliedTransformations < 4 ? this.v.rotate(-this.r.v) : !this.r && this.appliedTransformations < 4 && this.v.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]), this.autoOriented) {
                                var v, C;
                                if (u = this.elem.globalData.frameRate, this.p && this.p.keyframes && this.p.getValueAtTime) this.p._caching.lastFrame + this.p.offsetTime <= this.p.keyframes[0].t ? (v = this.p.getValueAtTime((this.p.keyframes[0].t + .01) / u, 0), C = this.p.getValueAtTime(this.p.keyframes[0].t / u, 0)) : this.p._caching.lastFrame + this.p.offsetTime >= this.p.keyframes[this.p.keyframes.length - 1].t ? (v = this.p.getValueAtTime(this.p.keyframes[this.p.keyframes.length - 1].t / u, 0), C = this.p.getValueAtTime((this.p.keyframes[this.p.keyframes.length - 1].t - .05) / u, 0)) : (v = this.p.pv, C = this.p.getValueAtTime((this.p._caching.lastFrame + this.p.offsetTime - .01) / u, this.p.offsetTime));
                                else if (this.px && this.px.keyframes && this.py.keyframes && this.px.getValueAtTime && this.py.getValueAtTime) {
                                    v = [], C = [];
                                    var d = this.px, S = this.py;
                                    d._caching.lastFrame + d.offsetTime <= d.keyframes[0].t ? (v[0] = d.getValueAtTime((d.keyframes[0].t + .01) / u, 0), v[1] = S.getValueAtTime((S.keyframes[0].t + .01) / u, 0), C[0] = d.getValueAtTime(d.keyframes[0].t / u, 0), C[1] = S.getValueAtTime(S.keyframes[0].t / u, 0)) : d._caching.lastFrame + d.offsetTime >= d.keyframes[d.keyframes.length - 1].t ? (v[0] = d.getValueAtTime(d.keyframes[d.keyframes.length - 1].t / u, 0), v[1] = S.getValueAtTime(S.keyframes[S.keyframes.length - 1].t / u, 0), C[0] = d.getValueAtTime((d.keyframes[d.keyframes.length - 1].t - .01) / u, 0), C[1] = S.getValueAtTime((S.keyframes[S.keyframes.length - 1].t - .01) / u, 0)) : (v = [
                                        d.pv,
                                        S.pv
                                    ], C[0] = d.getValueAtTime((d._caching.lastFrame + d.offsetTime - .01) / u, d.offsetTime), C[1] = S.getValueAtTime((S._caching.lastFrame + S.offsetTime - .01) / u, S.offsetTime));
                                } else C = e, v = C;
                                this.v.rotate(-Math.atan2(v[1] - C[1], v[0] - C[0]));
                            }
                            this.data.p && this.data.p.s ? this.data.p.z ? this.v.translate(this.px.v, this.py.v, -this.pz.v) : this.v.translate(this.px.v, this.py.v, 0) : this.v.translate(this.p.v[0], this.p.v[1], -this.p.v[2]);
                        }
                        this.frameId = this.elem.globalData.frameId;
                    }
                }
                function i() {
                    if (this.appliedTransformations = 0, this.pre.reset(), !this.a.effectsSequence.length) this.pre.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]), this.appliedTransformations = 1;
                    else return;
                    if (!this.s.effectsSequence.length) this.pre.scale(this.s.v[0], this.s.v[1], this.s.v[2]), this.appliedTransformations = 2;
                    else return;
                    if (this.sk) if (!this.sk.effectsSequence.length && !this.sa.effectsSequence.length) this.pre.skewFromAxis(-this.sk.v, this.sa.v), this.appliedTransformations = 3;
                    else return;
                    this.r ? this.r.effectsSequence.length || (this.pre.rotate(-this.r.v), this.appliedTransformations = 4) : !this.rz.effectsSequence.length && !this.ry.effectsSequence.length && !this.rx.effectsSequence.length && !this.or.effectsSequence.length && (this.pre.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]), this.appliedTransformations = 4);
                }
                function s() {}
                function a(c) {
                    this._addDynamicProperty(c), this.elem.addDynamicProperty(c), this._isDirty = !0;
                }
                function o(c, u, v) {
                    if (this.elem = c, this.frameId = -1, this.propType = "transform", this.data = u, this.v = new Matrix, this.pre = new Matrix, this.appliedTransformations = 0, this.initDynamicPropertyContainer(v || c), u.p && u.p.s ? (this.px = PropertyFactory.getProp(c, u.p.x, 0, 0, this), this.py = PropertyFactory.getProp(c, u.p.y, 0, 0, this), u.p.z && (this.pz = PropertyFactory.getProp(c, u.p.z, 0, 0, this))) : this.p = PropertyFactory.getProp(c, u.p || {
                        k: [
                            0,
                            0,
                            0
                        ]
                    }, 1, 0, this), u.rx) {
                        if (this.rx = PropertyFactory.getProp(c, u.rx, 0, degToRads, this), this.ry = PropertyFactory.getProp(c, u.ry, 0, degToRads, this), this.rz = PropertyFactory.getProp(c, u.rz, 0, degToRads, this), u.or.k[0].ti) {
                            var C, d = u.or.k.length;
                            for(C = 0; C < d; C += 1)u.or.k[C].to = null, u.or.k[C].ti = null;
                        }
                        this.or = PropertyFactory.getProp(c, u.or, 1, degToRads, this), this.or.sh = !0;
                    } else this.r = PropertyFactory.getProp(c, u.r || {
                        k: 0
                    }, 0, degToRads, this);
                    u.sk && (this.sk = PropertyFactory.getProp(c, u.sk, 0, degToRads, this), this.sa = PropertyFactory.getProp(c, u.sa, 0, degToRads, this)), this.a = PropertyFactory.getProp(c, u.a || {
                        k: [
                            0,
                            0,
                            0
                        ]
                    }, 1, 0, this), this.s = PropertyFactory.getProp(c, u.s || {
                        k: [
                            100,
                            100,
                            100
                        ]
                    }, 1, .01, this), u.o ? this.o = PropertyFactory.getProp(c, u.o, 0, .01, c) : this.o = {
                        _mdf: !1,
                        v: 1
                    }, this._isDirty = !0, this.dynamicProperties.length || this.getValue(!0);
                }
                o.prototype = {
                    applyToMatrix: t,
                    getValue: r,
                    precalculateMatrix: i,
                    autoOrient: s
                }, extendPrototype([
                    DynamicPropertyContainer
                ], o), o.prototype.addDynamicProperty = a, o.prototype._addDynamicProperty = DynamicPropertyContainer.prototype.addDynamicProperty;
                function h(c, u, v) {
                    return new o(c, u, v);
                }
                return {
                    getTransformProperty: h
                };
            }();
            function RepeaterModifier() {}
            extendPrototype([
                ShapeModifier
            ], RepeaterModifier), RepeaterModifier.prototype.initModifierProperties = function(e, t) {
                this.getValue = this.processKeys, this.c = PropertyFactory.getProp(e, t.c, 0, null, this), this.o = PropertyFactory.getProp(e, t.o, 0, null, this), this.tr = TransformPropertyFactory.getTransformProperty(e, t.tr, this), this.so = PropertyFactory.getProp(e, t.tr.so, 0, .01, this), this.eo = PropertyFactory.getProp(e, t.tr.eo, 0, .01, this), this.data = t, this.dynamicProperties.length || this.getValue(!0), this._isAnimated = !!this.dynamicProperties.length, this.pMatrix = new Matrix, this.rMatrix = new Matrix, this.sMatrix = new Matrix, this.tMatrix = new Matrix, this.matrix = new Matrix;
            }, RepeaterModifier.prototype.applyTransforms = function(e, t, r, i, s, a) {
                var o = a ? -1 : 1, h = i.s.v[0] + (1 - i.s.v[0]) * (1 - s), c = i.s.v[1] + (1 - i.s.v[1]) * (1 - s);
                e.translate(i.p.v[0] * o * s, i.p.v[1] * o * s, i.p.v[2]), t.translate(-i.a.v[0], -i.a.v[1], i.a.v[2]), t.rotate(-i.r.v * o * s), t.translate(i.a.v[0], i.a.v[1], i.a.v[2]), r.translate(-i.a.v[0], -i.a.v[1], i.a.v[2]), r.scale(a ? 1 / h : h, a ? 1 / c : c), r.translate(i.a.v[0], i.a.v[1], i.a.v[2]);
            }, RepeaterModifier.prototype.init = function(e, t, r, i) {
                for(this.elem = e, this.arr = t, this.pos = r, this.elemsData = i, this._currentCopies = 0, this._elements = [], this._groups = [], this.frameId = -1, this.initDynamicPropertyContainer(e), this.initModifierProperties(e, t[r]); r > 0;)r -= 1, this._elements.unshift(t[r]);
                this.dynamicProperties.length ? this.k = !0 : this.getValue(!0);
            }, RepeaterModifier.prototype.resetElements = function(e) {
                var t, r = e.length;
                for(t = 0; t < r; t += 1)e[t]._processed = !1, e[t].ty === "gr" && this.resetElements(e[t].it);
            }, RepeaterModifier.prototype.cloneElements = function(e) {
                var t = JSON.parse(JSON.stringify(e));
                return this.resetElements(t), t;
            }, RepeaterModifier.prototype.changeGroupRender = function(e, t) {
                var r, i = e.length;
                for(r = 0; r < i; r += 1)e[r]._render = t, e[r].ty === "gr" && this.changeGroupRender(e[r].it, t);
            }, RepeaterModifier.prototype.processShapes = function(e) {
                var t, r, i, s, a, o = !1;
                if (this._mdf || e) {
                    var h = Math.ceil(this.c.v);
                    if (this._groups.length < h) {
                        for(; this._groups.length < h;){
                            var c = {
                                it: this.cloneElements(this._elements),
                                ty: "gr"
                            };
                            c.it.push({
                                a: {
                                    a: 0,
                                    ix: 1,
                                    k: [
                                        0,
                                        0
                                    ]
                                },
                                nm: "Transform",
                                o: {
                                    a: 0,
                                    ix: 7,
                                    k: 100
                                },
                                p: {
                                    a: 0,
                                    ix: 2,
                                    k: [
                                        0,
                                        0
                                    ]
                                },
                                r: {
                                    a: 1,
                                    ix: 6,
                                    k: [
                                        {
                                            s: 0,
                                            e: 0,
                                            t: 0
                                        },
                                        {
                                            s: 0,
                                            e: 0,
                                            t: 1
                                        }
                                    ]
                                },
                                s: {
                                    a: 0,
                                    ix: 3,
                                    k: [
                                        100,
                                        100
                                    ]
                                },
                                sa: {
                                    a: 0,
                                    ix: 5,
                                    k: 0
                                },
                                sk: {
                                    a: 0,
                                    ix: 4,
                                    k: 0
                                },
                                ty: "tr"
                            }), this.arr.splice(0, 0, c), this._groups.splice(0, 0, c), this._currentCopies += 1;
                        }
                        this.elem.reloadShapes(), o = !0;
                    }
                    a = 0;
                    var u;
                    for(i = 0; i <= this._groups.length - 1; i += 1){
                        if (u = a < h, this._groups[i]._render = u, this.changeGroupRender(this._groups[i].it, u), !u) {
                            var v = this.elemsData[i].it, C = v[v.length - 1];
                            C.transform.op.v !== 0 ? (C.transform.op._mdf = !0, C.transform.op.v = 0) : C.transform.op._mdf = !1;
                        }
                        a += 1;
                    }
                    this._currentCopies = h;
                    var d = this.o.v, S = d % 1, _ = d > 0 ? Math.floor(d) : Math.ceil(d), g = this.pMatrix.props, T = this.rMatrix.props, x = this.sMatrix.props;
                    this.pMatrix.reset(), this.rMatrix.reset(), this.sMatrix.reset(), this.tMatrix.reset(), this.matrix.reset();
                    var E = 0;
                    if (d > 0) {
                        for(; E < _;)this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, !1), E += 1;
                        S && (this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, S, !1), E += S);
                    } else if (d < 0) {
                        for(; E > _;)this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, !0), E -= 1;
                        S && (this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, -S, !0), E -= S);
                    }
                    i = this.data.m === 1 ? 0 : this._currentCopies - 1, s = this.data.m === 1 ? 1 : -1, a = this._currentCopies;
                    for(var y, b; a;){
                        if (t = this.elemsData[i].it, r = t[t.length - 1].transform.mProps.v.props, b = r.length, t[t.length - 1].transform.mProps._mdf = !0, t[t.length - 1].transform.op._mdf = !0, t[t.length - 1].transform.op.v = this._currentCopies === 1 ? this.so.v : this.so.v + (this.eo.v - this.so.v) * (i / (this._currentCopies - 1)), E !== 0) {
                            for((i !== 0 && s === 1 || i !== this._currentCopies - 1 && s === -1) && this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, !1), this.matrix.transform(T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], T[9], T[10], T[11], T[12], T[13], T[14], T[15]), this.matrix.transform(x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], x[10], x[11], x[12], x[13], x[14], x[15]), this.matrix.transform(g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7], g[8], g[9], g[10], g[11], g[12], g[13], g[14], g[15]), y = 0; y < b; y += 1)r[y] = this.matrix.props[y];
                            this.matrix.reset();
                        } else for(this.matrix.reset(), y = 0; y < b; y += 1)r[y] = this.matrix.props[y];
                        E += 1, a -= 1, i += s;
                    }
                } else for(a = this._currentCopies, i = 0, s = 1; a;)t = this.elemsData[i].it, r = t[t.length - 1].transform.mProps.v.props, t[t.length - 1].transform.mProps._mdf = !1, t[t.length - 1].transform.op._mdf = !1, a -= 1, i += s;
                return o;
            }, RepeaterModifier.prototype.addShape = function() {};
            function RoundCornersModifier() {}
            extendPrototype([
                ShapeModifier
            ], RoundCornersModifier), RoundCornersModifier.prototype.initModifierProperties = function(e, t) {
                this.getValue = this.processKeys, this.rd = PropertyFactory.getProp(e, t.r, 0, null, this), this._isAnimated = !!this.rd.effectsSequence.length;
            }, RoundCornersModifier.prototype.processPath = function(e, t) {
                var r = shapePool.newElement();
                r.c = e.c;
                var i, s = e._length, a, o, h, c, u, v, C = 0, d, S, _, g, T, x;
                for(i = 0; i < s; i += 1)a = e.v[i], h = e.o[i], o = e.i[i], a[0] === h[0] && a[1] === h[1] && a[0] === o[0] && a[1] === o[1] ? (i === 0 || i === s - 1) && !e.c ? (r.setTripleAt(a[0], a[1], h[0], h[1], o[0], o[1], C), C += 1) : (i === 0 ? c = e.v[s - 1] : c = e.v[i - 1], u = Math.sqrt(Math.pow(a[0] - c[0], 2) + Math.pow(a[1] - c[1], 2)), v = u ? Math.min(u / 2, t) / u : 0, T = a[0] + (c[0] - a[0]) * v, d = T, x = a[1] - (a[1] - c[1]) * v, S = x, _ = d - (d - a[0]) * roundCorner, g = S - (S - a[1]) * roundCorner, r.setTripleAt(d, S, _, g, T, x, C), C += 1, i === s - 1 ? c = e.v[0] : c = e.v[i + 1], u = Math.sqrt(Math.pow(a[0] - c[0], 2) + Math.pow(a[1] - c[1], 2)), v = u ? Math.min(u / 2, t) / u : 0, _ = a[0] + (c[0] - a[0]) * v, d = _, g = a[1] + (c[1] - a[1]) * v, S = g, T = d - (d - a[0]) * roundCorner, x = S - (S - a[1]) * roundCorner, r.setTripleAt(d, S, _, g, T, x, C), C += 1) : (r.setTripleAt(e.v[i][0], e.v[i][1], e.o[i][0], e.o[i][1], e.i[i][0], e.i[i][1], C), C += 1);
                return r;
            }, RoundCornersModifier.prototype.processShapes = function(e) {
                var t, r, i = this.shapes.length, s, a, o = this.rd.v;
                if (o !== 0) {
                    var h, c;
                    for(r = 0; r < i; r += 1){
                        if (h = this.shapes[r], c = h.localShapeCollection, !(!h.shape._mdf && !this._mdf && !e)) for(c.releaseShapes(), h.shape._mdf = !0, t = h.shape.paths.shapes, a = h.shape.paths._length, s = 0; s < a; s += 1)c.addShape(this.processPath(t[s], o));
                        h.shape.paths = h.localShapeCollection;
                    }
                }
                this.dynamicProperties.length || (this._mdf = !1);
            };
            function floatEqual(e, t) {
                return Math.abs(e - t) * 1e5 <= Math.min(Math.abs(e), Math.abs(t));
            }
            function floatZero(e) {
                return Math.abs(e) <= 1e-5;
            }
            function lerp(e, t, r) {
                return e * (1 - r) + t * r;
            }
            function lerpPoint(e, t, r) {
                return [
                    lerp(e[0], t[0], r),
                    lerp(e[1], t[1], r)
                ];
            }
            function quadRoots(e, t, r) {
                if (e === 0) return [];
                var i = t * t - 4 * e * r;
                if (i < 0) return [];
                var s = -t / (2 * e);
                if (i === 0) return [
                    s
                ];
                var a = Math.sqrt(i) / (2 * e);
                return [
                    s - a,
                    s + a
                ];
            }
            function polynomialCoefficients(e, t, r, i) {
                return [
                    -e + 3 * t - 3 * r + i,
                    3 * e - 6 * t + 3 * r,
                    -3 * e + 3 * t,
                    e
                ];
            }
            function singlePoint(e) {
                return new PolynomialBezier(e, e, e, e, !1);
            }
            function PolynomialBezier(e, t, r, i, s) {
                s && pointEqual(e, t) && (t = lerpPoint(e, i, 1 / 3)), s && pointEqual(r, i) && (r = lerpPoint(e, i, 2 / 3));
                var a = polynomialCoefficients(e[0], t[0], r[0], i[0]), o = polynomialCoefficients(e[1], t[1], r[1], i[1]);
                this.a = [
                    a[0],
                    o[0]
                ], this.b = [
                    a[1],
                    o[1]
                ], this.c = [
                    a[2],
                    o[2]
                ], this.d = [
                    a[3],
                    o[3]
                ], this.points = [
                    e,
                    t,
                    r,
                    i
                ];
            }
            PolynomialBezier.prototype.point = function(e) {
                return [
                    ((this.a[0] * e + this.b[0]) * e + this.c[0]) * e + this.d[0],
                    ((this.a[1] * e + this.b[1]) * e + this.c[1]) * e + this.d[1]
                ];
            }, PolynomialBezier.prototype.derivative = function(e) {
                return [
                    (3 * e * this.a[0] + 2 * this.b[0]) * e + this.c[0],
                    (3 * e * this.a[1] + 2 * this.b[1]) * e + this.c[1]
                ];
            }, PolynomialBezier.prototype.tangentAngle = function(e) {
                var t = this.derivative(e);
                return Math.atan2(t[1], t[0]);
            }, PolynomialBezier.prototype.normalAngle = function(e) {
                var t = this.derivative(e);
                return Math.atan2(t[0], t[1]);
            }, PolynomialBezier.prototype.inflectionPoints = function() {
                var e = this.a[1] * this.b[0] - this.a[0] * this.b[1];
                if (floatZero(e)) return [];
                var t = -.5 * (this.a[1] * this.c[0] - this.a[0] * this.c[1]) / e, r = t * t - 1 / 3 * (this.b[1] * this.c[0] - this.b[0] * this.c[1]) / e;
                if (r < 0) return [];
                var i = Math.sqrt(r);
                return floatZero(i) ? i > 0 && i < 1 ? [
                    t
                ] : [] : [
                    t - i,
                    t + i
                ].filter(function(s) {
                    return s > 0 && s < 1;
                });
            }, PolynomialBezier.prototype.split = function(e) {
                if (e <= 0) return [
                    singlePoint(this.points[0]),
                    this
                ];
                if (e >= 1) return [
                    this,
                    singlePoint(this.points[this.points.length - 1])
                ];
                var t = lerpPoint(this.points[0], this.points[1], e), r = lerpPoint(this.points[1], this.points[2], e), i = lerpPoint(this.points[2], this.points[3], e), s = lerpPoint(t, r, e), a = lerpPoint(r, i, e), o = lerpPoint(s, a, e);
                return [
                    new PolynomialBezier(this.points[0], t, s, o, !0),
                    new PolynomialBezier(o, a, i, this.points[3], !0)
                ];
            };
            function extrema(e, t) {
                var r = e.points[0][t], i = e.points[e.points.length - 1][t];
                if (r > i) {
                    var s = i;
                    i = r, r = s;
                }
                for(var a = quadRoots(3 * e.a[t], 2 * e.b[t], e.c[t]), o = 0; o < a.length; o += 1)if (a[o] > 0 && a[o] < 1) {
                    var h = e.point(a[o])[t];
                    h < r ? r = h : h > i && (i = h);
                }
                return {
                    min: r,
                    max: i
                };
            }
            PolynomialBezier.prototype.bounds = function() {
                return {
                    x: extrema(this, 0),
                    y: extrema(this, 1)
                };
            }, PolynomialBezier.prototype.boundingBox = function() {
                var e = this.bounds();
                return {
                    left: e.x.min,
                    right: e.x.max,
                    top: e.y.min,
                    bottom: e.y.max,
                    width: e.x.max - e.x.min,
                    height: e.y.max - e.y.min,
                    cx: (e.x.max + e.x.min) / 2,
                    cy: (e.y.max + e.y.min) / 2
                };
            };
            function intersectData(e, t, r) {
                var i = e.boundingBox();
                return {
                    cx: i.cx,
                    cy: i.cy,
                    width: i.width,
                    height: i.height,
                    bez: e,
                    t: (t + r) / 2,
                    t1: t,
                    t2: r
                };
            }
            function splitData(e) {
                var t = e.bez.split(.5);
                return [
                    intersectData(t[0], e.t1, e.t),
                    intersectData(t[1], e.t, e.t2)
                ];
            }
            function boxIntersect(e, t) {
                return Math.abs(e.cx - t.cx) * 2 < e.width + t.width && Math.abs(e.cy - t.cy) * 2 < e.height + t.height;
            }
            function intersectsImpl(e, t, r, i, s, a) {
                if (boxIntersect(e, t)) {
                    if (r >= a || e.width <= i && e.height <= i && t.width <= i && t.height <= i) {
                        s.push([
                            e.t,
                            t.t
                        ]);
                        return;
                    }
                    var o = splitData(e), h = splitData(t);
                    intersectsImpl(o[0], h[0], r + 1, i, s, a), intersectsImpl(o[0], h[1], r + 1, i, s, a), intersectsImpl(o[1], h[0], r + 1, i, s, a), intersectsImpl(o[1], h[1], r + 1, i, s, a);
                }
            }
            PolynomialBezier.prototype.intersections = function(e, t, r) {
                t === void 0 && (t = 2), r === void 0 && (r = 7);
                var i = [];
                return intersectsImpl(intersectData(this, 0, 1), intersectData(e, 0, 1), 0, t, i, r), i;
            }, PolynomialBezier.shapeSegment = function(e, t) {
                var r = (t + 1) % e.length();
                return new PolynomialBezier(e.v[t], e.o[t], e.i[r], e.v[r], !0);
            }, PolynomialBezier.shapeSegmentInverted = function(e, t) {
                var r = (t + 1) % e.length();
                return new PolynomialBezier(e.v[r], e.i[r], e.o[t], e.v[t], !0);
            };
            function crossProduct(e, t) {
                return [
                    e[1] * t[2] - e[2] * t[1],
                    e[2] * t[0] - e[0] * t[2],
                    e[0] * t[1] - e[1] * t[0]
                ];
            }
            function lineIntersection(e, t, r, i) {
                var s = [
                    e[0],
                    e[1],
                    1
                ], a = [
                    t[0],
                    t[1],
                    1
                ], o = [
                    r[0],
                    r[1],
                    1
                ], h = [
                    i[0],
                    i[1],
                    1
                ], c = crossProduct(crossProduct(s, a), crossProduct(o, h));
                return floatZero(c[2]) ? null : [
                    c[0] / c[2],
                    c[1] / c[2]
                ];
            }
            function polarOffset(e, t, r) {
                return [
                    e[0] + Math.cos(t) * r,
                    e[1] - Math.sin(t) * r
                ];
            }
            function pointDistance(e, t) {
                return Math.hypot(e[0] - t[0], e[1] - t[1]);
            }
            function pointEqual(e, t) {
                return floatEqual(e[0], t[0]) && floatEqual(e[1], t[1]);
            }
            function ZigZagModifier() {}
            extendPrototype([
                ShapeModifier
            ], ZigZagModifier), ZigZagModifier.prototype.initModifierProperties = function(e, t) {
                this.getValue = this.processKeys, this.amplitude = PropertyFactory.getProp(e, t.s, 0, null, this), this.frequency = PropertyFactory.getProp(e, t.r, 0, null, this), this.pointsType = PropertyFactory.getProp(e, t.pt, 0, null, this), this._isAnimated = this.amplitude.effectsSequence.length !== 0 || this.frequency.effectsSequence.length !== 0 || this.pointsType.effectsSequence.length !== 0;
            };
            function setPoint(e, t, r, i, s, a, o) {
                var h = r - Math.PI / 2, c = r + Math.PI / 2, u = t[0] + Math.cos(r) * i * s, v = t[1] - Math.sin(r) * i * s;
                e.setTripleAt(u, v, u + Math.cos(h) * a, v - Math.sin(h) * a, u + Math.cos(c) * o, v - Math.sin(c) * o, e.length());
            }
            function getPerpendicularVector(e, t) {
                var r = [
                    t[0] - e[0],
                    t[1] - e[1]
                ], i = -Math.PI * .5, s = [
                    Math.cos(i) * r[0] - Math.sin(i) * r[1],
                    Math.sin(i) * r[0] + Math.cos(i) * r[1]
                ];
                return s;
            }
            function getProjectingAngle(e, t) {
                var r = t === 0 ? e.length() - 1 : t - 1, i = (t + 1) % e.length(), s = e.v[r], a = e.v[i], o = getPerpendicularVector(s, a);
                return Math.atan2(0, 1) - Math.atan2(o[1], o[0]);
            }
            function zigZagCorner(e, t, r, i, s, a, o) {
                var h = getProjectingAngle(t, r), c = t.v[r % t._length], u = t.v[r === 0 ? t._length - 1 : r - 1], v = t.v[(r + 1) % t._length], C = a === 2 ? Math.sqrt(Math.pow(c[0] - u[0], 2) + Math.pow(c[1] - u[1], 2)) : 0, d = a === 2 ? Math.sqrt(Math.pow(c[0] - v[0], 2) + Math.pow(c[1] - v[1], 2)) : 0;
                setPoint(e, t.v[r % t._length], h, o, i, d / ((s + 1) * 2), C / ((s + 1) * 2));
            }
            function zigZagSegment(e, t, r, i, s, a) {
                for(var o = 0; o < i; o += 1){
                    var h = (o + 1) / (i + 1), c = s === 2 ? Math.sqrt(Math.pow(t.points[3][0] - t.points[0][0], 2) + Math.pow(t.points[3][1] - t.points[0][1], 2)) : 0, u = t.normalAngle(h), v = t.point(h);
                    setPoint(e, v, u, a, r, c / ((i + 1) * 2), c / ((i + 1) * 2)), a = -a;
                }
                return a;
            }
            ZigZagModifier.prototype.processPath = function(e, t, r, i) {
                var s = e._length, a = shapePool.newElement();
                if (a.c = e.c, e.c || (s -= 1), s === 0) return a;
                var o = -1, h = PolynomialBezier.shapeSegment(e, 0);
                zigZagCorner(a, e, 0, t, r, i, o);
                for(var c = 0; c < s; c += 1)o = zigZagSegment(a, h, t, r, i, -o), c === s - 1 && !e.c ? h = null : h = PolynomialBezier.shapeSegment(e, (c + 1) % s), zigZagCorner(a, e, c + 1, t, r, i, o);
                return a;
            }, ZigZagModifier.prototype.processShapes = function(e) {
                var t, r, i = this.shapes.length, s, a, o = this.amplitude.v, h = Math.max(0, Math.round(this.frequency.v)), c = this.pointsType.v;
                if (o !== 0) {
                    var u, v;
                    for(r = 0; r < i; r += 1){
                        if (u = this.shapes[r], v = u.localShapeCollection, !(!u.shape._mdf && !this._mdf && !e)) for(v.releaseShapes(), u.shape._mdf = !0, t = u.shape.paths.shapes, a = u.shape.paths._length, s = 0; s < a; s += 1)v.addShape(this.processPath(t[s], o, h, c));
                        u.shape.paths = u.localShapeCollection;
                    }
                }
                this.dynamicProperties.length || (this._mdf = !1);
            };
            function linearOffset(e, t, r) {
                var i = Math.atan2(t[0] - e[0], t[1] - e[1]);
                return [
                    polarOffset(e, i, r),
                    polarOffset(t, i, r)
                ];
            }
            function offsetSegment(e, t) {
                var r, i, s, a, o, h, c;
                c = linearOffset(e.points[0], e.points[1], t), r = c[0], i = c[1], c = linearOffset(e.points[1], e.points[2], t), s = c[0], a = c[1], c = linearOffset(e.points[2], e.points[3], t), o = c[0], h = c[1];
                var u = lineIntersection(r, i, s, a);
                u === null && (u = i);
                var v = lineIntersection(o, h, s, a);
                return v === null && (v = o), new PolynomialBezier(r, u, v, h);
            }
            function joinLines(e, t, r, i, s) {
                var a = t.points[3], o = r.points[0];
                if (i === 3 || pointEqual(a, o)) return a;
                if (i === 2) {
                    var h = -t.tangentAngle(1), c = -r.tangentAngle(0) + Math.PI, u = lineIntersection(a, polarOffset(a, h + Math.PI / 2, 100), o, polarOffset(o, h + Math.PI / 2, 100)), v = u ? pointDistance(u, a) : pointDistance(a, o) / 2, C = polarOffset(a, h, 2 * v * roundCorner);
                    return e.setXYAt(C[0], C[1], "o", e.length() - 1), C = polarOffset(o, c, 2 * v * roundCorner), e.setTripleAt(o[0], o[1], o[0], o[1], C[0], C[1], e.length()), o;
                }
                var d = pointEqual(a, t.points[2]) ? t.points[0] : t.points[2], S = pointEqual(o, r.points[1]) ? r.points[3] : r.points[1], _ = lineIntersection(d, a, o, S);
                return _ && pointDistance(_, a) < s ? (e.setTripleAt(_[0], _[1], _[0], _[1], _[0], _[1], e.length()), _) : a;
            }
            function getIntersection(e, t) {
                var r = e.intersections(t);
                return r.length && floatEqual(r[0][0], 1) && r.shift(), r.length ? r[0] : null;
            }
            function pruneSegmentIntersection(e, t) {
                var r = e.slice(), i = t.slice(), s = getIntersection(e[e.length - 1], t[0]);
                return s && (r[e.length - 1] = e[e.length - 1].split(s[0])[0], i[0] = t[0].split(s[1])[1]), e.length > 1 && t.length > 1 && (s = getIntersection(e[0], t[t.length - 1]), s) ? [
                    [
                        e[0].split(s[0])[0]
                    ],
                    [
                        t[t.length - 1].split(s[1])[1]
                    ]
                ] : [
                    r,
                    i
                ];
            }
            function pruneIntersections(e) {
                for(var t, r = 1; r < e.length; r += 1)t = pruneSegmentIntersection(e[r - 1], e[r]), e[r - 1] = t[0], e[r] = t[1];
                return e.length > 1 && (t = pruneSegmentIntersection(e[e.length - 1], e[0]), e[e.length - 1] = t[0], e[0] = t[1]), e;
            }
            function offsetSegmentSplit(e, t) {
                var r = e.inflectionPoints(), i, s, a, o;
                if (r.length === 0) return [
                    offsetSegment(e, t)
                ];
                if (r.length === 1 || floatEqual(r[1], 1)) return a = e.split(r[0]), i = a[0], s = a[1], [
                    offsetSegment(i, t),
                    offsetSegment(s, t)
                ];
                a = e.split(r[0]), i = a[0];
                var h = (r[1] - r[0]) / (1 - r[0]);
                return a = a[1].split(h), o = a[0], s = a[1], [
                    offsetSegment(i, t),
                    offsetSegment(o, t),
                    offsetSegment(s, t)
                ];
            }
            function OffsetPathModifier() {}
            extendPrototype([
                ShapeModifier
            ], OffsetPathModifier), OffsetPathModifier.prototype.initModifierProperties = function(e, t) {
                this.getValue = this.processKeys, this.amount = PropertyFactory.getProp(e, t.a, 0, null, this), this.miterLimit = PropertyFactory.getProp(e, t.ml, 0, null, this), this.lineJoin = t.lj, this._isAnimated = this.amount.effectsSequence.length !== 0;
            }, OffsetPathModifier.prototype.processPath = function(e, t, r, i) {
                var s = shapePool.newElement();
                s.c = e.c;
                var a = e.length();
                e.c || (a -= 1);
                var o, h, c, u = [];
                for(o = 0; o < a; o += 1)c = PolynomialBezier.shapeSegment(e, o), u.push(offsetSegmentSplit(c, t));
                if (!e.c) for(o = a - 1; o >= 0; o -= 1)c = PolynomialBezier.shapeSegmentInverted(e, o), u.push(offsetSegmentSplit(c, t));
                u = pruneIntersections(u);
                var v = null, C = null;
                for(o = 0; o < u.length; o += 1){
                    var d = u[o];
                    for(C && (v = joinLines(s, C, d[0], r, i)), C = d[d.length - 1], h = 0; h < d.length; h += 1)c = d[h], v && pointEqual(c.points[0], v) ? s.setXYAt(c.points[1][0], c.points[1][1], "o", s.length() - 1) : s.setTripleAt(c.points[0][0], c.points[0][1], c.points[1][0], c.points[1][1], c.points[0][0], c.points[0][1], s.length()), s.setTripleAt(c.points[3][0], c.points[3][1], c.points[3][0], c.points[3][1], c.points[2][0], c.points[2][1], s.length()), v = c.points[3];
                }
                return u.length && joinLines(s, C, u[0][0], r, i), s;
            }, OffsetPathModifier.prototype.processShapes = function(e) {
                var t, r, i = this.shapes.length, s, a, o = this.amount.v, h = this.miterLimit.v, c = this.lineJoin;
                if (o !== 0) {
                    var u, v;
                    for(r = 0; r < i; r += 1){
                        if (u = this.shapes[r], v = u.localShapeCollection, !(!u.shape._mdf && !this._mdf && !e)) for(v.releaseShapes(), u.shape._mdf = !0, t = u.shape.paths.shapes, a = u.shape.paths._length, s = 0; s < a; s += 1)v.addShape(this.processPath(t[s], o, c, h));
                        u.shape.paths = u.localShapeCollection;
                    }
                }
                this.dynamicProperties.length || (this._mdf = !1);
            };
            function getFontProperties(e) {
                for(var t = e.fStyle ? e.fStyle.split(" ") : [], r = "normal", i = "normal", s = t.length, a, o = 0; o < s; o += 1)switch(a = t[o].toLowerCase(), a){
                    case "italic":
                        i = "italic";
                        break;
                    case "bold":
                        r = "700";
                        break;
                    case "black":
                        r = "900";
                        break;
                    case "medium":
                        r = "500";
                        break;
                    case "regular":
                    case "normal":
                        r = "400";
                        break;
                    case "light":
                    case "thin":
                        r = "200";
                        break;
                }
                return {
                    style: i,
                    weight: e.fWeight || r
                };
            }
            var FontManager = function() {
                var e = 5e3, t = {
                    w: 0,
                    size: 0,
                    shapes: [],
                    data: {
                        shapes: []
                    }
                }, r = [];
                r = r.concat([
                    2304,
                    2305,
                    2306,
                    2307,
                    2362,
                    2363,
                    2364,
                    2364,
                    2366,
                    2367,
                    2368,
                    2369,
                    2370,
                    2371,
                    2372,
                    2373,
                    2374,
                    2375,
                    2376,
                    2377,
                    2378,
                    2379,
                    2380,
                    2381,
                    2382,
                    2383,
                    2387,
                    2388,
                    2389,
                    2390,
                    2391,
                    2402,
                    2403
                ]);
                var i = 127988, s = 917631, a = 917601, o = 917626, h = 65039, c = 8205, u = 127462, v = 127487, C = [
                    "d83cdffb",
                    "d83cdffc",
                    "d83cdffd",
                    "d83cdffe",
                    "d83cdfff"
                ];
                function d(A) {
                    var F = A.split(","), P, R = F.length, L = [];
                    for(P = 0; P < R; P += 1)F[P] !== "sans-serif" && F[P] !== "monospace" && L.push(F[P]);
                    return L.join(",");
                }
                function S(A, F) {
                    var P = createTag("span");
                    P.setAttribute("aria-hidden", !0), P.style.fontFamily = F;
                    var R = createTag("span");
                    R.innerText = "giItT1WQy@!-/#", P.style.position = "absolute", P.style.left = "-10000px", P.style.top = "-10000px", P.style.fontSize = "300px", P.style.fontVariant = "normal", P.style.fontStyle = "normal", P.style.fontWeight = "normal", P.style.letterSpacing = "0", P.appendChild(R), document.body.appendChild(P);
                    var L = R.offsetWidth;
                    return R.style.fontFamily = d(A) + ", " + F, {
                        node: R,
                        w: L,
                        parent: P
                    };
                }
                function _() {
                    var A, F = this.fonts.length, P, R, L = F;
                    for(A = 0; A < F; A += 1)this.fonts[A].loaded ? L -= 1 : this.fonts[A].fOrigin === "n" || this.fonts[A].origin === 0 ? this.fonts[A].loaded = !0 : (P = this.fonts[A].monoCase.node, R = this.fonts[A].monoCase.w, P.offsetWidth !== R ? (L -= 1, this.fonts[A].loaded = !0) : (P = this.fonts[A].sansCase.node, R = this.fonts[A].sansCase.w, P.offsetWidth !== R && (L -= 1, this.fonts[A].loaded = !0)), this.fonts[A].loaded && (this.fonts[A].sansCase.parent.parentNode.removeChild(this.fonts[A].sansCase.parent), this.fonts[A].monoCase.parent.parentNode.removeChild(this.fonts[A].monoCase.parent)));
                    L !== 0 && Date.now() - this.initTime < e ? setTimeout(this.checkLoadedFontsBinded, 20) : setTimeout(this.setIsLoadedBinded, 10);
                }
                function g(A, F) {
                    var P = document.body && F ? "svg" : "canvas", R, L = getFontProperties(A);
                    if (P === "svg") {
                        var N = createNS("text");
                        N.style.fontSize = "100px", N.setAttribute("font-family", A.fFamily), N.setAttribute("font-style", L.style), N.setAttribute("font-weight", L.weight), N.textContent = "1", A.fClass ? (N.style.fontFamily = "inherit", N.setAttribute("class", A.fClass)) : N.style.fontFamily = A.fFamily, F.appendChild(N), R = N;
                    } else {
                        var $ = new OffscreenCanvas(500, 500).getContext("2d");
                        $.font = L.style + " " + L.weight + " 100px " + A.fFamily, R = $;
                    }
                    function O(H) {
                        return P === "svg" ? (R.textContent = H, R.getComputedTextLength()) : R.measureText(H).width;
                    }
                    return {
                        measureText: O
                    };
                }
                function T(A, F) {
                    if (!A) {
                        this.isLoaded = !0;
                        return;
                    }
                    if (this.chars) {
                        this.isLoaded = !0, this.fonts = A.list;
                        return;
                    }
                    if (!document.body) {
                        this.isLoaded = !0, A.list.forEach(function(re) {
                            re.helper = g(re), re.cache = {};
                        }), this.fonts = A.list;
                        return;
                    }
                    var P = A.list, R, L = P.length, N = L;
                    for(R = 0; R < L; R += 1){
                        var $ = !0, O, H;
                        if (P[R].loaded = !1, P[R].monoCase = S(P[R].fFamily, "monospace"), P[R].sansCase = S(P[R].fFamily, "sans-serif"), !P[R].fPath) P[R].loaded = !0, N -= 1;
                        else if (P[R].fOrigin === "p" || P[R].origin === 3) {
                            if (O = document.querySelectorAll('style[f-forigin="p"][f-family="' + P[R].fFamily + '"], style[f-origin="3"][f-family="' + P[R].fFamily + '"]'), O.length > 0 && ($ = !1), $) {
                                var Y = createTag("style");
                                Y.setAttribute("f-forigin", P[R].fOrigin), Y.setAttribute("f-origin", P[R].origin), Y.setAttribute("f-family", P[R].fFamily), Y.type = "text/css", Y.innerText = "@font-face {font-family: " + P[R].fFamily + "; font-style: normal; src: url('" + P[R].fPath + "');}", F.appendChild(Y);
                            }
                        } else if (P[R].fOrigin === "g" || P[R].origin === 1) {
                            for(O = document.querySelectorAll('link[f-forigin="g"], link[f-origin="1"]'), H = 0; H < O.length; H += 1)O[H].href.indexOf(P[R].fPath) !== -1 && ($ = !1);
                            if ($) {
                                var Z = createTag("link");
                                Z.setAttribute("f-forigin", P[R].fOrigin), Z.setAttribute("f-origin", P[R].origin), Z.type = "text/css", Z.rel = "stylesheet", Z.href = P[R].fPath, document.body.appendChild(Z);
                            }
                        } else if (P[R].fOrigin === "t" || P[R].origin === 2) {
                            for(O = document.querySelectorAll('script[f-forigin="t"], script[f-origin="2"]'), H = 0; H < O.length; H += 1)P[R].fPath === O[H].src && ($ = !1);
                            if ($) {
                                var ee = createTag("link");
                                ee.setAttribute("f-forigin", P[R].fOrigin), ee.setAttribute("f-origin", P[R].origin), ee.setAttribute("rel", "stylesheet"), ee.setAttribute("href", P[R].fPath), F.appendChild(ee);
                            }
                        }
                        P[R].helper = g(P[R], F), P[R].cache = {}, this.fonts.push(P[R]);
                    }
                    N === 0 ? this.isLoaded = !0 : setTimeout(this.checkLoadedFonts.bind(this), 100);
                }
                function x(A) {
                    if (A) {
                        this.chars || (this.chars = []);
                        var F, P = A.length, R, L = this.chars.length, N;
                        for(F = 0; F < P; F += 1){
                            for(R = 0, N = !1; R < L;)this.chars[R].style === A[F].style && this.chars[R].fFamily === A[F].fFamily && this.chars[R].ch === A[F].ch && (N = !0), R += 1;
                            N || (this.chars.push(A[F]), L += 1);
                        }
                    }
                }
                function E(A, F, P) {
                    for(var R = 0, L = this.chars.length; R < L;){
                        if (this.chars[R].ch === A && this.chars[R].style === F && this.chars[R].fFamily === P) return this.chars[R];
                        R += 1;
                    }
                    return (typeof A == "string" && A.charCodeAt(0) !== 13 || !A) && console && console.warn && !this._warned && (this._warned = !0, console.warn("Missing character from exported characters list: ", A, F, P)), t;
                }
                function y(A, F, P) {
                    var R = this.getFontByName(F), L = A;
                    if (!R.cache[L]) {
                        var N = R.helper;
                        if (A === " ") {
                            var $ = N.measureText("|" + A + "|"), O = N.measureText("||");
                            R.cache[L] = ($ - O) / 100;
                        } else R.cache[L] = N.measureText(A) / 100;
                    }
                    return R.cache[L] * P;
                }
                function b(A) {
                    for(var F = 0, P = this.fonts.length; F < P;){
                        if (this.fonts[F].fName === A) return this.fonts[F];
                        F += 1;
                    }
                    return this.fonts[0];
                }
                function w(A) {
                    var F = 0, P = A.charCodeAt(0);
                    if (P >= 55296 && P <= 56319) {
                        var R = A.charCodeAt(1);
                        R >= 56320 && R <= 57343 && (F = (P - 55296) * 1024 + R - 56320 + 65536);
                    }
                    return F;
                }
                function j(A, F) {
                    var P = A.toString(16) + F.toString(16);
                    return C.indexOf(P) !== -1;
                }
                function M(A) {
                    return A === c;
                }
                function I(A) {
                    return A === h;
                }
                function D(A) {
                    var F = w(A);
                    return F >= u && F <= v;
                }
                function B(A) {
                    return D(A.substr(0, 2)) && D(A.substr(2, 2));
                }
                function G(A) {
                    return r.indexOf(A) !== -1;
                }
                function V(A, F) {
                    var P = w(A.substr(F, 2));
                    if (P !== i) return !1;
                    var R = 0;
                    for(F += 2; R < 5;){
                        if (P = w(A.substr(F, 2)), P < a || P > o) return !1;
                        R += 1, F += 2;
                    }
                    return w(A.substr(F, 2)) === s;
                }
                function U() {
                    this.isLoaded = !0;
                }
                var W = function() {
                    this.fonts = [], this.chars = null, this.typekitLoaded = 0, this.isLoaded = !1, this._warned = !1, this.initTime = Date.now(), this.setIsLoadedBinded = this.setIsLoaded.bind(this), this.checkLoadedFontsBinded = this.checkLoadedFonts.bind(this);
                };
                W.isModifier = j, W.isZeroWidthJoiner = M, W.isFlagEmoji = B, W.isRegionalCode = D, W.isCombinedCharacter = G, W.isRegionalFlag = V, W.isVariationSelector = I, W.BLACK_FLAG_CODE_POINT = i;
                var z = {
                    addChars: x,
                    addFonts: T,
                    getCharData: E,
                    getFontByName: b,
                    measureText: y,
                    checkLoadedFonts: _,
                    setIsLoaded: U
                };
                return W.prototype = z, W;
            }();
            function SlotManager(e) {
                this.animationData = e;
            }
            SlotManager.prototype.getProp = function(e) {
                return this.animationData.slots && this.animationData.slots[e.sid] ? Object.assign(e, this.animationData.slots[e.sid].p) : e;
            };
            function slotFactory(e) {
                return new SlotManager(e);
            }
            function RenderableElement() {}
            RenderableElement.prototype = {
                initRenderable: function() {
                    this.isInRange = !1, this.hidden = !1, this.isTransparent = !1, this.renderableComponents = [];
                },
                addRenderableComponent: function(t) {
                    this.renderableComponents.indexOf(t) === -1 && this.renderableComponents.push(t);
                },
                removeRenderableComponent: function(t) {
                    this.renderableComponents.indexOf(t) !== -1 && this.renderableComponents.splice(this.renderableComponents.indexOf(t), 1);
                },
                prepareRenderableFrame: function(t) {
                    this.checkLayerLimits(t);
                },
                checkTransparency: function() {
                    this.finalTransform.mProp.o.v <= 0 ? !this.isTransparent && this.globalData.renderConfig.hideOnTransparent && (this.isTransparent = !0, this.hide()) : this.isTransparent && (this.isTransparent = !1, this.show());
                },
                checkLayerLimits: function(t) {
                    this.data.ip - this.data.st <= t && this.data.op - this.data.st > t ? this.isInRange !== !0 && (this.globalData._mdf = !0, this._mdf = !0, this.isInRange = !0, this.show()) : this.isInRange !== !1 && (this.globalData._mdf = !0, this.isInRange = !1, this.hide());
                },
                renderRenderable: function() {
                    var t, r = this.renderableComponents.length;
                    for(t = 0; t < r; t += 1)this.renderableComponents[t].renderFrame(this._isFirstFrame);
                },
                sourceRectAtTime: function() {
                    return {
                        top: 0,
                        left: 0,
                        width: 100,
                        height: 100
                    };
                },
                getLayerSize: function() {
                    return this.data.ty === 5 ? {
                        w: this.data.textData.width,
                        h: this.data.textData.height
                    } : {
                        w: this.data.width,
                        h: this.data.height
                    };
                }
            };
            var getBlendMode = function() {
                var e = {
                    0: "source-over",
                    1: "multiply",
                    2: "screen",
                    3: "overlay",
                    4: "darken",
                    5: "lighten",
                    6: "color-dodge",
                    7: "color-burn",
                    8: "hard-light",
                    9: "soft-light",
                    10: "difference",
                    11: "exclusion",
                    12: "hue",
                    13: "saturation",
                    14: "color",
                    15: "luminosity"
                };
                return function(t) {
                    return e[t] || "";
                };
            }();
            function SliderEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 0, 0, r);
            }
            function AngleEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 0, 0, r);
            }
            function ColorEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 1, 0, r);
            }
            function PointEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 1, 0, r);
            }
            function LayerIndexEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 0, 0, r);
            }
            function MaskIndexEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 0, 0, r);
            }
            function CheckboxEffect(e, t, r) {
                this.p = PropertyFactory.getProp(t, e.v, 0, 0, r);
            }
            function NoValueEffect() {
                this.p = {};
            }
            function EffectsManager(e, t) {
                var r = e.ef || [];
                this.effectElements = [];
                var i, s = r.length, a;
                for(i = 0; i < s; i += 1)a = new GroupEffect(r[i], t), this.effectElements.push(a);
            }
            function GroupEffect(e, t) {
                this.init(e, t);
            }
            extendPrototype([
                DynamicPropertyContainer
            ], GroupEffect), GroupEffect.prototype.getValue = GroupEffect.prototype.iterateDynamicProperties, GroupEffect.prototype.init = function(e, t) {
                this.data = e, this.effectElements = [], this.initDynamicPropertyContainer(t);
                var r, i = this.data.ef.length, s, a = this.data.ef;
                for(r = 0; r < i; r += 1){
                    switch(s = null, a[r].ty){
                        case 0:
                            s = new SliderEffect(a[r], t, this);
                            break;
                        case 1:
                            s = new AngleEffect(a[r], t, this);
                            break;
                        case 2:
                            s = new ColorEffect(a[r], t, this);
                            break;
                        case 3:
                            s = new PointEffect(a[r], t, this);
                            break;
                        case 4:
                        case 7:
                            s = new CheckboxEffect(a[r], t, this);
                            break;
                        case 10:
                            s = new LayerIndexEffect(a[r], t, this);
                            break;
                        case 11:
                            s = new MaskIndexEffect(a[r], t, this);
                            break;
                        case 5:
                            s = new EffectsManager(a[r], t);
                            break;
                        default:
                            s = new NoValueEffect(a[r]);
                            break;
                    }
                    s && this.effectElements.push(s);
                }
            };
            function BaseElement() {}
            BaseElement.prototype = {
                checkMasks: function() {
                    if (!this.data.hasMask) return !1;
                    for(var t = 0, r = this.data.masksProperties.length; t < r;){
                        if (this.data.masksProperties[t].mode !== "n" && this.data.masksProperties[t].cl !== !1) return !0;
                        t += 1;
                    }
                    return !1;
                },
                initExpressions: function() {
                    var t = getExpressionInterfaces();
                    if (t) {
                        var r = t("layer"), i = t("effects"), s = t("shape"), a = t("text"), o = t("comp");
                        this.layerInterface = r(this), this.data.hasMask && this.maskManager && this.layerInterface.registerMaskInterface(this.maskManager);
                        var h = i.createEffectsInterface(this, this.layerInterface);
                        this.layerInterface.registerEffectsInterface(h), this.data.ty === 0 || this.data.xt ? this.compInterface = o(this) : this.data.ty === 4 ? (this.layerInterface.shapeInterface = s(this.shapesData, this.itemsData, this.layerInterface), this.layerInterface.content = this.layerInterface.shapeInterface) : this.data.ty === 5 && (this.layerInterface.textInterface = a(this), this.layerInterface.text = this.layerInterface.textInterface);
                    }
                },
                setBlendMode: function() {
                    var t = getBlendMode(this.data.bm), r = this.baseElement || this.layerElement;
                    r.style["mix-blend-mode"] = t;
                },
                initBaseData: function(t, r, i) {
                    this.globalData = r, this.comp = i, this.data = t, this.layerId = createElementID(), this.data.sr || (this.data.sr = 1), this.effectsManager = new EffectsManager(this.data, this, this.dynamicProperties);
                },
                getType: function() {
                    return this.type;
                },
                sourceRectAtTime: function() {}
            };
            function FrameElement() {}
            FrameElement.prototype = {
                initFrame: function() {
                    this._isFirstFrame = !1, this.dynamicProperties = [], this._mdf = !1;
                },
                prepareProperties: function(t, r) {
                    var i, s = this.dynamicProperties.length;
                    for(i = 0; i < s; i += 1)(r || this._isParent && this.dynamicProperties[i].propType === "transform") && (this.dynamicProperties[i].getValue(), this.dynamicProperties[i]._mdf && (this.globalData._mdf = !0, this._mdf = !0));
                },
                addDynamicProperty: function(t) {
                    this.dynamicProperties.indexOf(t) === -1 && this.dynamicProperties.push(t);
                }
            };
            function FootageElement(e, t, r) {
                this.initFrame(), this.initRenderable(), this.assetData = t.getAssetData(e.refId), this.footageData = t.imageLoader.getAsset(this.assetData), this.initBaseData(e, t, r);
            }
            FootageElement.prototype.prepareFrame = function() {}, extendPrototype([
                RenderableElement,
                BaseElement,
                FrameElement
            ], FootageElement), FootageElement.prototype.getBaseElement = function() {
                return null;
            }, FootageElement.prototype.renderFrame = function() {}, FootageElement.prototype.destroy = function() {}, FootageElement.prototype.initExpressions = function() {
                var e = getExpressionInterfaces();
                if (e) {
                    var t = e("footage");
                    this.layerInterface = t(this);
                }
            }, FootageElement.prototype.getFootageData = function() {
                return this.footageData;
            };
            function AudioElement(e, t, r) {
                this.initFrame(), this.initRenderable(), this.assetData = t.getAssetData(e.refId), this.initBaseData(e, t, r), this._isPlaying = !1, this._canPlay = !1;
                var i = this.globalData.getAssetsPath(this.assetData);
                this.audio = this.globalData.audioController.createAudio(i), this._currentTime = 0, this.globalData.audioController.addAudio(this), this._volumeMultiplier = 1, this._volume = 1, this._previousVolume = null, this.tm = e.tm ? PropertyFactory.getProp(this, e.tm, 0, t.frameRate, this) : {
                    _placeholder: !0
                }, this.lv = PropertyFactory.getProp(this, e.au && e.au.lv ? e.au.lv : {
                    k: [
                        100
                    ]
                }, 1, .01, this);
            }
            AudioElement.prototype.prepareFrame = function(e) {
                if (this.prepareRenderableFrame(e, !0), this.prepareProperties(e, !0), this.tm._placeholder) this._currentTime = e / this.data.sr;
                else {
                    var t = this.tm.v;
                    this._currentTime = t;
                }
                this._volume = this.lv.v[0];
                var r = this._volume * this._volumeMultiplier;
                this._previousVolume !== r && (this._previousVolume = r, this.audio.volume(r));
            }, extendPrototype([
                RenderableElement,
                BaseElement,
                FrameElement
            ], AudioElement), AudioElement.prototype.renderFrame = function() {
                this.isInRange && this._canPlay && (this._isPlaying ? (!this.audio.playing() || Math.abs(this._currentTime / this.globalData.frameRate - this.audio.seek()) > .1) && this.audio.seek(this._currentTime / this.globalData.frameRate) : (this.audio.play(), this.audio.seek(this._currentTime / this.globalData.frameRate), this._isPlaying = !0));
            }, AudioElement.prototype.show = function() {}, AudioElement.prototype.hide = function() {
                this.audio.pause(), this._isPlaying = !1;
            }, AudioElement.prototype.pause = function() {
                this.audio.pause(), this._isPlaying = !1, this._canPlay = !1;
            }, AudioElement.prototype.resume = function() {
                this._canPlay = !0;
            }, AudioElement.prototype.setRate = function(e) {
                this.audio.rate(e);
            }, AudioElement.prototype.volume = function(e) {
                this._volumeMultiplier = e, this._previousVolume = e * this._volume, this.audio.volume(this._previousVolume);
            }, AudioElement.prototype.getBaseElement = function() {
                return null;
            }, AudioElement.prototype.destroy = function() {}, AudioElement.prototype.sourceRectAtTime = function() {}, AudioElement.prototype.initExpressions = function() {};
            function BaseRenderer() {}
            BaseRenderer.prototype.checkLayers = function(e) {
                var t, r = this.layers.length, i;
                for(this.completeLayers = !0, t = r - 1; t >= 0; t -= 1)this.elements[t] || (i = this.layers[t], i.ip - i.st <= e - this.layers[t].st && i.op - i.st > e - this.layers[t].st && this.buildItem(t)), this.completeLayers = this.elements[t] ? this.completeLayers : !1;
                this.checkPendingElements();
            }, BaseRenderer.prototype.createItem = function(e) {
                switch(e.ty){
                    case 2:
                        return this.createImage(e);
                    case 0:
                        return this.createComp(e);
                    case 1:
                        return this.createSolid(e);
                    case 3:
                        return this.createNull(e);
                    case 4:
                        return this.createShape(e);
                    case 5:
                        return this.createText(e);
                    case 6:
                        return this.createAudio(e);
                    case 13:
                        return this.createCamera(e);
                    case 15:
                        return this.createFootage(e);
                    default:
                        return this.createNull(e);
                }
            }, BaseRenderer.prototype.createCamera = function() {
                throw new Error("You're using a 3d camera. Try the html renderer.");
            }, BaseRenderer.prototype.createAudio = function(e) {
                return new AudioElement(e, this.globalData, this);
            }, BaseRenderer.prototype.createFootage = function(e) {
                return new FootageElement(e, this.globalData, this);
            }, BaseRenderer.prototype.buildAllItems = function() {
                var e, t = this.layers.length;
                for(e = 0; e < t; e += 1)this.buildItem(e);
                this.checkPendingElements();
            }, BaseRenderer.prototype.includeLayers = function(e) {
                this.completeLayers = !1;
                var t, r = e.length, i, s = this.layers.length;
                for(t = 0; t < r; t += 1)for(i = 0; i < s;){
                    if (this.layers[i].id === e[t].id) {
                        this.layers[i] = e[t];
                        break;
                    }
                    i += 1;
                }
            }, BaseRenderer.prototype.setProjectInterface = function(e) {
                this.globalData.projectInterface = e;
            }, BaseRenderer.prototype.initItems = function() {
                this.globalData.progressiveLoad || this.buildAllItems();
            }, BaseRenderer.prototype.buildElementParenting = function(e, t, r) {
                for(var i = this.elements, s = this.layers, a = 0, o = s.length; a < o;)s[a].ind == t && (!i[a] || i[a] === !0 ? (this.buildItem(a), this.addPendingElement(e)) : (r.push(i[a]), i[a].setAsParent(), s[a].parent !== void 0 ? this.buildElementParenting(e, s[a].parent, r) : e.setHierarchy(r))), a += 1;
            }, BaseRenderer.prototype.addPendingElement = function(e) {
                this.pendingElements.push(e);
            }, BaseRenderer.prototype.searchExtraCompositions = function(e) {
                var t, r = e.length;
                for(t = 0; t < r; t += 1)if (e[t].xt) {
                    var i = this.createComp(e[t]);
                    i.initExpressions(), this.globalData.projectInterface.registerComposition(i);
                }
            }, BaseRenderer.prototype.getElementById = function(e) {
                var t, r = this.elements.length;
                for(t = 0; t < r; t += 1)if (this.elements[t].data.ind === e) return this.elements[t];
                return null;
            }, BaseRenderer.prototype.getElementByPath = function(e) {
                var t = e.shift(), r;
                if (typeof t == "number") r = this.elements[t];
                else {
                    var i, s = this.elements.length;
                    for(i = 0; i < s; i += 1)if (this.elements[i].data.nm === t) {
                        r = this.elements[i];
                        break;
                    }
                }
                return e.length === 0 ? r : r.getElementByPath(e);
            }, BaseRenderer.prototype.setupGlobalData = function(e, t) {
                this.globalData.fontManager = new FontManager, this.globalData.slotManager = slotFactory(e), this.globalData.fontManager.addChars(e.chars), this.globalData.fontManager.addFonts(e.fonts, t), this.globalData.getAssetData = this.animationItem.getAssetData.bind(this.animationItem), this.globalData.getAssetsPath = this.animationItem.getAssetsPath.bind(this.animationItem), this.globalData.imageLoader = this.animationItem.imagePreloader, this.globalData.audioController = this.animationItem.audioController, this.globalData.frameId = 0, this.globalData.frameRate = e.fr, this.globalData.nm = e.nm, this.globalData.compSize = {
                    w: e.w,
                    h: e.h
                };
            };
            var effectTypes = {
                TRANSFORM_EFFECT: "transformEFfect"
            };
            function TransformElement() {}
            TransformElement.prototype = {
                initTransform: function() {
                    var t = new Matrix;
                    this.finalTransform = {
                        mProp: this.data.ks ? TransformPropertyFactory.getTransformProperty(this, this.data.ks, this) : {
                            o: 0
                        },
                        _matMdf: !1,
                        _localMatMdf: !1,
                        _opMdf: !1,
                        mat: t,
                        localMat: t,
                        localOpacity: 1
                    }, this.data.ao && (this.finalTransform.mProp.autoOriented = !0), this.data.ty;
                },
                renderTransform: function() {
                    if (this.finalTransform._opMdf = this.finalTransform.mProp.o._mdf || this._isFirstFrame, this.finalTransform._matMdf = this.finalTransform.mProp._mdf || this._isFirstFrame, this.hierarchy) {
                        var t, r = this.finalTransform.mat, i = 0, s = this.hierarchy.length;
                        if (!this.finalTransform._matMdf) for(; i < s;){
                            if (this.hierarchy[i].finalTransform.mProp._mdf) {
                                this.finalTransform._matMdf = !0;
                                break;
                            }
                            i += 1;
                        }
                        if (this.finalTransform._matMdf) for(t = this.finalTransform.mProp.v.props, r.cloneFromProps(t), i = 0; i < s; i += 1)r.multiply(this.hierarchy[i].finalTransform.mProp.v);
                    }
                    (!this.localTransforms || this.finalTransform._matMdf) && (this.finalTransform._localMatMdf = this.finalTransform._matMdf), this.finalTransform._opMdf && (this.finalTransform.localOpacity = this.finalTransform.mProp.o.v);
                },
                renderLocalTransform: function() {
                    if (this.localTransforms) {
                        var t = 0, r = this.localTransforms.length;
                        if (this.finalTransform._localMatMdf = this.finalTransform._matMdf, !this.finalTransform._localMatMdf || !this.finalTransform._opMdf) for(; t < r;)this.localTransforms[t]._mdf && (this.finalTransform._localMatMdf = !0), this.localTransforms[t]._opMdf && !this.finalTransform._opMdf && (this.finalTransform.localOpacity = this.finalTransform.mProp.o.v, this.finalTransform._opMdf = !0), t += 1;
                        if (this.finalTransform._localMatMdf) {
                            var i = this.finalTransform.localMat;
                            for(this.localTransforms[0].matrix.clone(i), t = 1; t < r; t += 1){
                                var s = this.localTransforms[t].matrix;
                                i.multiply(s);
                            }
                            i.multiply(this.finalTransform.mat);
                        }
                        if (this.finalTransform._opMdf) {
                            var a = this.finalTransform.localOpacity;
                            for(t = 0; t < r; t += 1)a *= this.localTransforms[t].opacity * .01;
                            this.finalTransform.localOpacity = a;
                        }
                    }
                },
                searchEffectTransforms: function() {
                    if (this.renderableEffectsManager) {
                        var t = this.renderableEffectsManager.getEffects(effectTypes.TRANSFORM_EFFECT);
                        if (t.length) {
                            this.localTransforms = [], this.finalTransform.localMat = new Matrix;
                            var r = 0, i = t.length;
                            for(r = 0; r < i; r += 1)this.localTransforms.push(t[r]);
                        }
                    }
                },
                globalToLocal: function(t) {
                    var r = [];
                    r.push(this.finalTransform);
                    for(var i = !0, s = this.comp; i;)s.finalTransform ? (s.data.hasMask && r.splice(0, 0, s.finalTransform), s = s.comp) : i = !1;
                    var a, o = r.length, h;
                    for(a = 0; a < o; a += 1)h = r[a].mat.applyToPointArray(0, 0, 0), t = [
                        t[0] - h[0],
                        t[1] - h[1],
                        0
                    ];
                    return t;
                },
                mHelper: new Matrix
            };
            function MaskElement(e, t, r) {
                this.data = e, this.element = t, this.globalData = r, this.storedData = [], this.masksProperties = this.data.masksProperties || [], this.maskElement = null;
                var i = this.globalData.defs, s, a = this.masksProperties ? this.masksProperties.length : 0;
                this.viewData = createSizedArray(a), this.solidPath = "";
                var o, h = this.masksProperties, c = 0, u = [], v, C, d = createElementID(), S, _, g, T, x = "clipPath", E = "clip-path";
                for(s = 0; s < a; s += 1)if ((h[s].mode !== "a" && h[s].mode !== "n" || h[s].inv || h[s].o.k !== 100 || h[s].o.x) && (x = "mask", E = "mask"), (h[s].mode === "s" || h[s].mode === "i") && c === 0 ? (S = createNS("rect"), S.setAttribute("fill", "#ffffff"), S.setAttribute("width", this.element.comp.data.w || 0), S.setAttribute("height", this.element.comp.data.h || 0), u.push(S)) : S = null, o = createNS("path"), h[s].mode === "n") this.viewData[s] = {
                    op: PropertyFactory.getProp(this.element, h[s].o, 0, .01, this.element),
                    prop: ShapePropertyFactory.getShapeProp(this.element, h[s], 3),
                    elem: o,
                    lastPath: ""
                }, i.appendChild(o);
                else {
                    c += 1, o.setAttribute("fill", h[s].mode === "s" ? "#000000" : "#ffffff"), o.setAttribute("clip-rule", "nonzero");
                    var y;
                    if (h[s].x.k !== 0 ? (x = "mask", E = "mask", T = PropertyFactory.getProp(this.element, h[s].x, 0, null, this.element), y = createElementID(), _ = createNS("filter"), _.setAttribute("id", y), g = createNS("feMorphology"), g.setAttribute("operator", "erode"), g.setAttribute("in", "SourceGraphic"), g.setAttribute("radius", "0"), _.appendChild(g), i.appendChild(_), o.setAttribute("stroke", h[s].mode === "s" ? "#000000" : "#ffffff")) : (g = null, T = null), this.storedData[s] = {
                        elem: o,
                        x: T,
                        expan: g,
                        lastPath: "",
                        lastOperator: "",
                        filterId: y,
                        lastRadius: 0
                    }, h[s].mode === "i") {
                        C = u.length;
                        var b = createNS("g");
                        for(v = 0; v < C; v += 1)b.appendChild(u[v]);
                        var w = createNS("mask");
                        w.setAttribute("mask-type", "alpha"), w.setAttribute("id", d + "_" + c), w.appendChild(o), i.appendChild(w), b.setAttribute("mask", "url(" + getLocationHref() + "#" + d + "_" + c + ")"), u.length = 0, u.push(b);
                    } else u.push(o);
                    h[s].inv && !this.solidPath && (this.solidPath = this.createLayerSolidPath()), this.viewData[s] = {
                        elem: o,
                        lastPath: "",
                        op: PropertyFactory.getProp(this.element, h[s].o, 0, .01, this.element),
                        prop: ShapePropertyFactory.getShapeProp(this.element, h[s], 3),
                        invRect: S
                    }, this.viewData[s].prop.k || this.drawPath(h[s], this.viewData[s].prop.v, this.viewData[s]);
                }
                for(this.maskElement = createNS(x), a = u.length, s = 0; s < a; s += 1)this.maskElement.appendChild(u[s]);
                c > 0 && (this.maskElement.setAttribute("id", d), this.element.maskedElement.setAttribute(E, "url(" + getLocationHref() + "#" + d + ")"), i.appendChild(this.maskElement)), this.viewData.length && this.element.addRenderableComponent(this);
            }
            MaskElement.prototype.getMaskProperty = function(e) {
                return this.viewData[e].prop;
            }, MaskElement.prototype.renderFrame = function(e) {
                var t = this.element.finalTransform.mat, r, i = this.masksProperties.length;
                for(r = 0; r < i; r += 1)if ((this.viewData[r].prop._mdf || e) && this.drawPath(this.masksProperties[r], this.viewData[r].prop.v, this.viewData[r]), (this.viewData[r].op._mdf || e) && this.viewData[r].elem.setAttribute("fill-opacity", this.viewData[r].op.v), this.masksProperties[r].mode !== "n" && (this.viewData[r].invRect && (this.element.finalTransform.mProp._mdf || e) && this.viewData[r].invRect.setAttribute("transform", t.getInverseMatrix().to2dCSS()), this.storedData[r].x && (this.storedData[r].x._mdf || e))) {
                    var s = this.storedData[r].expan;
                    this.storedData[r].x.v < 0 ? (this.storedData[r].lastOperator !== "erode" && (this.storedData[r].lastOperator = "erode", this.storedData[r].elem.setAttribute("filter", "url(" + getLocationHref() + "#" + this.storedData[r].filterId + ")")), s.setAttribute("radius", -this.storedData[r].x.v)) : (this.storedData[r].lastOperator !== "dilate" && (this.storedData[r].lastOperator = "dilate", this.storedData[r].elem.setAttribute("filter", null)), this.storedData[r].elem.setAttribute("stroke-width", this.storedData[r].x.v * 2));
                }
            }, MaskElement.prototype.getMaskelement = function() {
                return this.maskElement;
            }, MaskElement.prototype.createLayerSolidPath = function() {
                var e = "M0,0 ";
                return e += " h" + this.globalData.compSize.w, e += " v" + this.globalData.compSize.h, e += " h-" + this.globalData.compSize.w, e += " v-" + this.globalData.compSize.h + " ", e;
            }, MaskElement.prototype.drawPath = function(e, t, r) {
                var i = " M" + t.v[0][0] + "," + t.v[0][1], s, a;
                for(a = t._length, s = 1; s < a; s += 1)i += " C" + t.o[s - 1][0] + "," + t.o[s - 1][1] + " " + t.i[s][0] + "," + t.i[s][1] + " " + t.v[s][0] + "," + t.v[s][1];
                if (t.c && a > 1 && (i += " C" + t.o[s - 1][0] + "," + t.o[s - 1][1] + " " + t.i[0][0] + "," + t.i[0][1] + " " + t.v[0][0] + "," + t.v[0][1]), r.lastPath !== i) {
                    var o = "";
                    r.elem && (t.c && (o = e.inv ? this.solidPath + i : i), r.elem.setAttribute("d", o)), r.lastPath = i;
                }
            }, MaskElement.prototype.destroy = function() {
                this.element = null, this.globalData = null, this.maskElement = null, this.data = null, this.masksProperties = null;
            };
            var filtersFactory = function() {
                var e = {};
                e.createFilter = t, e.createAlphaToLuminanceFilter = r;
                function t(i, s) {
                    var a = createNS("filter");
                    return a.setAttribute("id", i), s !== !0 && (a.setAttribute("filterUnits", "objectBoundingBox"), a.setAttribute("x", "0%"), a.setAttribute("y", "0%"), a.setAttribute("width", "100%"), a.setAttribute("height", "100%")), a;
                }
                function r() {
                    var i = createNS("feColorMatrix");
                    return i.setAttribute("type", "matrix"), i.setAttribute("color-interpolation-filters", "sRGB"), i.setAttribute("values", "0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 1 1"), i;
                }
                return e;
            }(), featureSupport = function() {
                var e = {
                    maskType: !0,
                    svgLumaHidden: !0,
                    offscreenCanvas: typeof OffscreenCanvas < "u"
                };
                return (/MSIE 10/i.test(navigator.userAgent) || /MSIE 9/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent)) && (e.maskType = !1), /firefox/i.test(navigator.userAgent) && (e.svgLumaHidden = !1), e;
            }(), registeredEffects$1 = {}, idPrefix = "filter_result_";
            function SVGEffects(e) {
                var t, r = "SourceGraphic", i = e.data.ef ? e.data.ef.length : 0, s = createElementID(), a = filtersFactory.createFilter(s, !0), o = 0;
                this.filters = [];
                var h;
                for(t = 0; t < i; t += 1){
                    h = null;
                    var c = e.data.ef[t].ty;
                    if (registeredEffects$1[c]) {
                        var u = registeredEffects$1[c].effect;
                        h = new u(a, e.effectsManager.effectElements[t], e, idPrefix + o, r), r = idPrefix + o, registeredEffects$1[c].countsAsEffect && (o += 1);
                    }
                    h && this.filters.push(h);
                }
                o && (e.globalData.defs.appendChild(a), e.layerElement.setAttribute("filter", "url(" + getLocationHref() + "#" + s + ")")), this.filters.length && e.addRenderableComponent(this);
            }
            SVGEffects.prototype.renderFrame = function(e) {
                var t, r = this.filters.length;
                for(t = 0; t < r; t += 1)this.filters[t].renderFrame(e);
            }, SVGEffects.prototype.getEffects = function(e) {
                var t, r = this.filters.length, i = [];
                for(t = 0; t < r; t += 1)this.filters[t].type === e && i.push(this.filters[t]);
                return i;
            };
            function registerEffect$1(e, t, r) {
                registeredEffects$1[e] = {
                    effect: t,
                    countsAsEffect: r
                };
            }
            function SVGBaseElement() {}
            SVGBaseElement.prototype = {
                initRendererElement: function() {
                    this.layerElement = createNS("g");
                },
                createContainerElements: function() {
                    this.matteElement = createNS("g"), this.transformedElement = this.layerElement, this.maskedElement = this.layerElement, this._sizeChanged = !1;
                    var t = null;
                    if (this.data.td) {
                        this.matteMasks = {};
                        var r = createNS("g");
                        r.setAttribute("id", this.layerId), r.appendChild(this.layerElement), t = r, this.globalData.defs.appendChild(r);
                    } else this.data.tt ? (this.matteElement.appendChild(this.layerElement), t = this.matteElement, this.baseElement = this.matteElement) : this.baseElement = this.layerElement;
                    if (this.data.ln && this.layerElement.setAttribute("id", this.data.ln), this.data.cl && this.layerElement.setAttribute("class", this.data.cl), this.data.ty === 0 && !this.data.hd) {
                        var i = createNS("clipPath"), s = createNS("path");
                        s.setAttribute("d", "M0,0 L" + this.data.w + ",0 L" + this.data.w + "," + this.data.h + " L0," + this.data.h + "z");
                        var a = createElementID();
                        if (i.setAttribute("id", a), i.appendChild(s), this.globalData.defs.appendChild(i), this.checkMasks()) {
                            var o = createNS("g");
                            o.setAttribute("clip-path", "url(" + getLocationHref() + "#" + a + ")"), o.appendChild(this.layerElement), this.transformedElement = o, t ? t.appendChild(this.transformedElement) : this.baseElement = this.transformedElement;
                        } else this.layerElement.setAttribute("clip-path", "url(" + getLocationHref() + "#" + a + ")");
                    }
                    this.data.bm !== 0 && this.setBlendMode();
                },
                renderElement: function() {
                    this.finalTransform._localMatMdf && this.transformedElement.setAttribute("transform", this.finalTransform.localMat.to2dCSS()), this.finalTransform._opMdf && this.transformedElement.setAttribute("opacity", this.finalTransform.localOpacity);
                },
                destroyBaseElement: function() {
                    this.layerElement = null, this.matteElement = null, this.maskManager.destroy();
                },
                getBaseElement: function() {
                    return this.data.hd ? null : this.baseElement;
                },
                createRenderableComponents: function() {
                    this.maskManager = new MaskElement(this.data, this, this.globalData), this.renderableEffectsManager = new SVGEffects(this), this.searchEffectTransforms();
                },
                getMatte: function(t) {
                    if (this.matteMasks || (this.matteMasks = {}), !this.matteMasks[t]) {
                        var r = this.layerId + "_" + t, i, s, a, o;
                        if (t === 1 || t === 3) {
                            var h = createNS("mask");
                            h.setAttribute("id", r), h.setAttribute("mask-type", t === 3 ? "luminance" : "alpha"), a = createNS("use"), a.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + this.layerId), h.appendChild(a), this.globalData.defs.appendChild(h), !featureSupport.maskType && t === 1 && (h.setAttribute("mask-type", "luminance"), i = createElementID(), s = filtersFactory.createFilter(i), this.globalData.defs.appendChild(s), s.appendChild(filtersFactory.createAlphaToLuminanceFilter()), o = createNS("g"), o.appendChild(a), h.appendChild(o), o.setAttribute("filter", "url(" + getLocationHref() + "#" + i + ")"));
                        } else if (t === 2) {
                            var c = createNS("mask");
                            c.setAttribute("id", r), c.setAttribute("mask-type", "alpha");
                            var u = createNS("g");
                            c.appendChild(u), i = createElementID(), s = filtersFactory.createFilter(i);
                            var v = createNS("feComponentTransfer");
                            v.setAttribute("in", "SourceGraphic"), s.appendChild(v);
                            var C = createNS("feFuncA");
                            C.setAttribute("type", "table"), C.setAttribute("tableValues", "1.0 0.0"), v.appendChild(C), this.globalData.defs.appendChild(s);
                            var d = createNS("rect");
                            d.setAttribute("width", this.comp.data.w), d.setAttribute("height", this.comp.data.h), d.setAttribute("x", "0"), d.setAttribute("y", "0"), d.setAttribute("fill", "#ffffff"), d.setAttribute("opacity", "0"), u.setAttribute("filter", "url(" + getLocationHref() + "#" + i + ")"), u.appendChild(d), a = createNS("use"), a.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + this.layerId), u.appendChild(a), featureSupport.maskType || (c.setAttribute("mask-type", "luminance"), s.appendChild(filtersFactory.createAlphaToLuminanceFilter()), o = createNS("g"), u.appendChild(d), o.appendChild(this.layerElement), u.appendChild(o)), this.globalData.defs.appendChild(c);
                        }
                        this.matteMasks[t] = r;
                    }
                    return this.matteMasks[t];
                },
                setMatte: function(t) {
                    this.matteElement && this.matteElement.setAttribute("mask", "url(" + getLocationHref() + "#" + t + ")");
                }
            };
            function HierarchyElement() {}
            HierarchyElement.prototype = {
                initHierarchy: function() {
                    this.hierarchy = [], this._isParent = !1, this.checkParenting();
                },
                setHierarchy: function(t) {
                    this.hierarchy = t;
                },
                setAsParent: function() {
                    this._isParent = !0;
                },
                checkParenting: function() {
                    this.data.parent !== void 0 && this.comp.buildElementParenting(this, this.data.parent, []);
                }
            };
            function RenderableDOMElement() {}
            (function() {
                var e = {
                    initElement: function(r, i, s) {
                        this.initFrame(), this.initBaseData(r, i, s), this.initTransform(r, i, s), this.initHierarchy(), this.initRenderable(), this.initRendererElement(), this.createContainerElements(), this.createRenderableComponents(), this.createContent(), this.hide();
                    },
                    hide: function() {
                        if (!this.hidden && (!this.isInRange || this.isTransparent)) {
                            var r = this.baseElement || this.layerElement;
                            r.style.display = "none", this.hidden = !0;
                        }
                    },
                    show: function() {
                        if (this.isInRange && !this.isTransparent) {
                            if (!this.data.hd) {
                                var r = this.baseElement || this.layerElement;
                                r.style.display = "block";
                            }
                            this.hidden = !1, this._isFirstFrame = !0;
                        }
                    },
                    renderFrame: function() {
                        this.data.hd || this.hidden || (this.renderTransform(), this.renderRenderable(), this.renderLocalTransform(), this.renderElement(), this.renderInnerContent(), this._isFirstFrame && (this._isFirstFrame = !1));
                    },
                    renderInnerContent: function() {},
                    prepareFrame: function(r) {
                        this._mdf = !1, this.prepareRenderableFrame(r), this.prepareProperties(r, this.isInRange), this.checkTransparency();
                    },
                    destroy: function() {
                        this.innerElem = null, this.destroyBaseElement();
                    }
                };
                extendPrototype([
                    RenderableElement,
                    createProxyFunction(e)
                ], RenderableDOMElement);
            })();
            function IImageElement(e, t, r) {
                this.assetData = t.getAssetData(e.refId), this.assetData && this.assetData.sid && (this.assetData = t.slotManager.getProp(this.assetData)), this.initElement(e, t, r), this.sourceRect = {
                    top: 0,
                    left: 0,
                    width: this.assetData.w,
                    height: this.assetData.h
                };
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                SVGBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement
            ], IImageElement), IImageElement.prototype.createContent = function() {
                var e = this.globalData.getAssetsPath(this.assetData);
                this.innerElem = createNS("image"), this.innerElem.setAttribute("width", this.assetData.w + "px"), this.innerElem.setAttribute("height", this.assetData.h + "px"), this.innerElem.setAttribute("preserveAspectRatio", this.assetData.pr || this.globalData.renderConfig.imagePreserveAspectRatio), this.innerElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", e), this.layerElement.appendChild(this.innerElem);
            }, IImageElement.prototype.sourceRectAtTime = function() {
                return this.sourceRect;
            };
            function ProcessedElement(e, t) {
                this.elem = e, this.pos = t;
            }
            function IShapeElement() {}
            IShapeElement.prototype = {
                addShapeToModifiers: function(t) {
                    var r, i = this.shapeModifiers.length;
                    for(r = 0; r < i; r += 1)this.shapeModifiers[r].addShape(t);
                },
                isShapeInAnimatedModifiers: function(t) {
                    for(var r = 0, i = this.shapeModifiers.length; r < i;)if (this.shapeModifiers[r].isAnimatedWithShape(t)) return !0;
                    return !1;
                },
                renderModifiers: function() {
                    if (this.shapeModifiers.length) {
                        var t, r = this.shapes.length;
                        for(t = 0; t < r; t += 1)this.shapes[t].sh.reset();
                        r = this.shapeModifiers.length;
                        var i;
                        for(t = r - 1; t >= 0 && (i = this.shapeModifiers[t].processShapes(this._isFirstFrame), !i); t -= 1);
                    }
                },
                searchProcessedElement: function(t) {
                    for(var r = this.processedElements, i = 0, s = r.length; i < s;){
                        if (r[i].elem === t) return r[i].pos;
                        i += 1;
                    }
                    return 0;
                },
                addProcessedElement: function(t, r) {
                    for(var i = this.processedElements, s = i.length; s;)if (s -= 1, i[s].elem === t) {
                        i[s].pos = r;
                        return;
                    }
                    i.push(new ProcessedElement(t, r));
                },
                prepareFrame: function(t) {
                    this.prepareRenderableFrame(t), this.prepareProperties(t, this.isInRange);
                }
            };
            var lineCapEnum = {
                1: "butt",
                2: "round",
                3: "square"
            }, lineJoinEnum = {
                1: "miter",
                2: "round",
                3: "bevel"
            };
            function SVGShapeData(e, t, r) {
                this.caches = [], this.styles = [], this.transformers = e, this.lStr = "", this.sh = r, this.lvl = t, this._isAnimated = !!r.k;
                for(var i = 0, s = e.length; i < s;){
                    if (e[i].mProps.dynamicProperties.length) {
                        this._isAnimated = !0;
                        break;
                    }
                    i += 1;
                }
            }
            SVGShapeData.prototype.setAsAnimated = function() {
                this._isAnimated = !0;
            };
            function SVGStyleData(e, t) {
                this.data = e, this.type = e.ty, this.d = "", this.lvl = t, this._mdf = !1, this.closed = e.hd === !0, this.pElem = createNS("path"), this.msElem = null;
            }
            SVGStyleData.prototype.reset = function() {
                this.d = "", this._mdf = !1;
            };
            function DashProperty(e, t, r, i) {
                this.elem = e, this.frameId = -1, this.dataProps = createSizedArray(t.length), this.renderer = r, this.k = !1, this.dashStr = "", this.dashArray = createTypedArray("float32", t.length ? t.length - 1 : 0), this.dashoffset = createTypedArray("float32", 1), this.initDynamicPropertyContainer(i);
                var s, a = t.length || 0, o;
                for(s = 0; s < a; s += 1)o = PropertyFactory.getProp(e, t[s].v, 0, 0, this), this.k = o.k || this.k, this.dataProps[s] = {
                    n: t[s].n,
                    p: o
                };
                this.k || this.getValue(!0), this._isAnimated = this.k;
            }
            DashProperty.prototype.getValue = function(e) {
                if (!(this.elem.globalData.frameId === this.frameId && !e) && (this.frameId = this.elem.globalData.frameId, this.iterateDynamicProperties(), this._mdf = this._mdf || e, this._mdf)) {
                    var t = 0, r = this.dataProps.length;
                    for(this.renderer === "svg" && (this.dashStr = ""), t = 0; t < r; t += 1)this.dataProps[t].n !== "o" ? this.renderer === "svg" ? this.dashStr += " " + this.dataProps[t].p.v : this.dashArray[t] = this.dataProps[t].p.v : this.dashoffset[0] = this.dataProps[t].p.v;
                }
            }, extendPrototype([
                DynamicPropertyContainer
            ], DashProperty);
            function SVGStrokeStyleData(e, t, r) {
                this.initDynamicPropertyContainer(e), this.getValue = this.iterateDynamicProperties, this.o = PropertyFactory.getProp(e, t.o, 0, .01, this), this.w = PropertyFactory.getProp(e, t.w, 0, null, this), this.d = new DashProperty(e, t.d || {}, "svg", this), this.c = PropertyFactory.getProp(e, t.c, 1, 255, this), this.style = r, this._isAnimated = !!this._isAnimated;
            }
            extendPrototype([
                DynamicPropertyContainer
            ], SVGStrokeStyleData);
            function SVGFillStyleData(e, t, r) {
                this.initDynamicPropertyContainer(e), this.getValue = this.iterateDynamicProperties, this.o = PropertyFactory.getProp(e, t.o, 0, .01, this), this.c = PropertyFactory.getProp(e, t.c, 1, 255, this), this.style = r;
            }
            extendPrototype([
                DynamicPropertyContainer
            ], SVGFillStyleData);
            function SVGNoStyleData(e, t, r) {
                this.initDynamicPropertyContainer(e), this.getValue = this.iterateDynamicProperties, this.style = r;
            }
            extendPrototype([
                DynamicPropertyContainer
            ], SVGNoStyleData);
            function GradientProperty(e, t, r) {
                this.data = t, this.c = createTypedArray("uint8c", t.p * 4);
                var i = t.k.k[0].s ? t.k.k[0].s.length - t.p * 4 : t.k.k.length - t.p * 4;
                this.o = createTypedArray("float32", i), this._cmdf = !1, this._omdf = !1, this._collapsable = this.checkCollapsable(), this._hasOpacity = i, this.initDynamicPropertyContainer(r), this.prop = PropertyFactory.getProp(e, t.k, 1, null, this), this.k = this.prop.k, this.getValue(!0);
            }
            GradientProperty.prototype.comparePoints = function(e, t) {
                for(var r = 0, i = this.o.length / 2, s; r < i;){
                    if (s = Math.abs(e[r * 4] - e[t * 4 + r * 2]), s > .01) return !1;
                    r += 1;
                }
                return !0;
            }, GradientProperty.prototype.checkCollapsable = function() {
                if (this.o.length / 2 !== this.c.length / 4) return !1;
                if (this.data.k.k[0].s) for(var e = 0, t = this.data.k.k.length; e < t;){
                    if (!this.comparePoints(this.data.k.k[e].s, this.data.p)) return !1;
                    e += 1;
                }
                else if (!this.comparePoints(this.data.k.k, this.data.p)) return !1;
                return !0;
            }, GradientProperty.prototype.getValue = function(e) {
                if (this.prop.getValue(), this._mdf = !1, this._cmdf = !1, this._omdf = !1, this.prop._mdf || e) {
                    var t, r = this.data.p * 4, i, s;
                    for(t = 0; t < r; t += 1)i = t % 4 === 0 ? 100 : 255, s = Math.round(this.prop.v[t] * i), this.c[t] !== s && (this.c[t] = s, this._cmdf = !e);
                    if (this.o.length) for(r = this.prop.v.length, t = this.data.p * 4; t < r; t += 1)i = t % 2 === 0 ? 100 : 1, s = t % 2 === 0 ? Math.round(this.prop.v[t] * 100) : this.prop.v[t], this.o[t - this.data.p * 4] !== s && (this.o[t - this.data.p * 4] = s, this._omdf = !e);
                    this._mdf = !e;
                }
            }, extendPrototype([
                DynamicPropertyContainer
            ], GradientProperty);
            function SVGGradientFillStyleData(e, t, r) {
                this.initDynamicPropertyContainer(e), this.getValue = this.iterateDynamicProperties, this.initGradientData(e, t, r);
            }
            SVGGradientFillStyleData.prototype.initGradientData = function(e, t, r) {
                this.o = PropertyFactory.getProp(e, t.o, 0, .01, this), this.s = PropertyFactory.getProp(e, t.s, 1, null, this), this.e = PropertyFactory.getProp(e, t.e, 1, null, this), this.h = PropertyFactory.getProp(e, t.h || {
                    k: 0
                }, 0, .01, this), this.a = PropertyFactory.getProp(e, t.a || {
                    k: 0
                }, 0, degToRads, this), this.g = new GradientProperty(e, t.g, this), this.style = r, this.stops = [], this.setGradientData(r.pElem, t), this.setGradientOpacity(t, r), this._isAnimated = !!this._isAnimated;
            }, SVGGradientFillStyleData.prototype.setGradientData = function(e, t) {
                var r = createElementID(), i = createNS(t.t === 1 ? "linearGradient" : "radialGradient");
                i.setAttribute("id", r), i.setAttribute("spreadMethod", "pad"), i.setAttribute("gradientUnits", "userSpaceOnUse");
                var s = [], a, o, h;
                for(h = t.g.p * 4, o = 0; o < h; o += 4)a = createNS("stop"), i.appendChild(a), s.push(a);
                e.setAttribute(t.ty === "gf" ? "fill" : "stroke", "url(" + getLocationHref() + "#" + r + ")"), this.gf = i, this.cst = s;
            }, SVGGradientFillStyleData.prototype.setGradientOpacity = function(e, t) {
                if (this.g._hasOpacity && !this.g._collapsable) {
                    var r, i, s, a = createNS("mask"), o = createNS("path");
                    a.appendChild(o);
                    var h = createElementID(), c = createElementID();
                    a.setAttribute("id", c);
                    var u = createNS(e.t === 1 ? "linearGradient" : "radialGradient");
                    u.setAttribute("id", h), u.setAttribute("spreadMethod", "pad"), u.setAttribute("gradientUnits", "userSpaceOnUse"), s = e.g.k.k[0].s ? e.g.k.k[0].s.length : e.g.k.k.length;
                    var v = this.stops;
                    for(i = e.g.p * 4; i < s; i += 2)r = createNS("stop"), r.setAttribute("stop-color", "rgb(255,255,255)"), u.appendChild(r), v.push(r);
                    o.setAttribute(e.ty === "gf" ? "fill" : "stroke", "url(" + getLocationHref() + "#" + h + ")"), e.ty === "gs" && (o.setAttribute("stroke-linecap", lineCapEnum[e.lc || 2]), o.setAttribute("stroke-linejoin", lineJoinEnum[e.lj || 2]), e.lj === 1 && o.setAttribute("stroke-miterlimit", e.ml)), this.of = u, this.ms = a, this.ost = v, this.maskId = c, t.msElem = o;
                }
            }, extendPrototype([
                DynamicPropertyContainer
            ], SVGGradientFillStyleData);
            function SVGGradientStrokeStyleData(e, t, r) {
                this.initDynamicPropertyContainer(e), this.getValue = this.iterateDynamicProperties, this.w = PropertyFactory.getProp(e, t.w, 0, null, this), this.d = new DashProperty(e, t.d || {}, "svg", this), this.initGradientData(e, t, r), this._isAnimated = !!this._isAnimated;
            }
            extendPrototype([
                SVGGradientFillStyleData,
                DynamicPropertyContainer
            ], SVGGradientStrokeStyleData);
            function ShapeGroupData() {
                this.it = [], this.prevViewData = [], this.gr = createNS("g");
            }
            function SVGTransformData(e, t, r) {
                this.transform = {
                    mProps: e,
                    op: t,
                    container: r
                }, this.elements = [], this._isAnimated = this.transform.mProps.dynamicProperties.length || this.transform.op.effectsSequence.length;
            }
            var buildShapeString = function(t, r, i, s) {
                if (r === 0) return "";
                var a = t.o, o = t.i, h = t.v, c, u = " M" + s.applyToPointStringified(h[0][0], h[0][1]);
                for(c = 1; c < r; c += 1)u += " C" + s.applyToPointStringified(a[c - 1][0], a[c - 1][1]) + " " + s.applyToPointStringified(o[c][0], o[c][1]) + " " + s.applyToPointStringified(h[c][0], h[c][1]);
                return i && r && (u += " C" + s.applyToPointStringified(a[c - 1][0], a[c - 1][1]) + " " + s.applyToPointStringified(o[0][0], o[0][1]) + " " + s.applyToPointStringified(h[0][0], h[0][1]), u += "z"), u;
            }, SVGElementsRenderer = function() {
                var e = new Matrix, t = new Matrix, r = {
                    createRenderFunction: i
                };
                function i(C) {
                    switch(C.ty){
                        case "fl":
                            return h;
                        case "gf":
                            return u;
                        case "gs":
                            return c;
                        case "st":
                            return v;
                        case "sh":
                        case "el":
                        case "rc":
                        case "sr":
                            return o;
                        case "tr":
                            return s;
                        case "no":
                            return a;
                        default:
                            return null;
                    }
                }
                function s(C, d, S) {
                    (S || d.transform.op._mdf) && d.transform.container.setAttribute("opacity", d.transform.op.v), (S || d.transform.mProps._mdf) && d.transform.container.setAttribute("transform", d.transform.mProps.v.to2dCSS());
                }
                function a() {}
                function o(C, d, S) {
                    var _, g, T, x, E, y, b = d.styles.length, w = d.lvl, j, M, I, D;
                    for(y = 0; y < b; y += 1){
                        if (x = d.sh._mdf || S, d.styles[y].lvl < w) {
                            for(M = t.reset(), I = w - d.styles[y].lvl, D = d.transformers.length - 1; !x && I > 0;)x = d.transformers[D].mProps._mdf || x, I -= 1, D -= 1;
                            if (x) for(I = w - d.styles[y].lvl, D = d.transformers.length - 1; I > 0;)M.multiply(d.transformers[D].mProps.v), I -= 1, D -= 1;
                        } else M = e;
                        if (j = d.sh.paths, g = j._length, x) {
                            for(T = "", _ = 0; _ < g; _ += 1)E = j.shapes[_], E && E._length && (T += buildShapeString(E, E._length, E.c, M));
                            d.caches[y] = T;
                        } else T = d.caches[y];
                        d.styles[y].d += C.hd === !0 ? "" : T, d.styles[y]._mdf = x || d.styles[y]._mdf;
                    }
                }
                function h(C, d, S) {
                    var _ = d.style;
                    (d.c._mdf || S) && _.pElem.setAttribute("fill", "rgb(" + bmFloor(d.c.v[0]) + "," + bmFloor(d.c.v[1]) + "," + bmFloor(d.c.v[2]) + ")"), (d.o._mdf || S) && _.pElem.setAttribute("fill-opacity", d.o.v);
                }
                function c(C, d, S) {
                    u(C, d, S), v(C, d, S);
                }
                function u(C, d, S) {
                    var _ = d.gf, g = d.g._hasOpacity, T = d.s.v, x = d.e.v;
                    if (d.o._mdf || S) {
                        var E = C.ty === "gf" ? "fill-opacity" : "stroke-opacity";
                        d.style.pElem.setAttribute(E, d.o.v);
                    }
                    if (d.s._mdf || S) {
                        var y = C.t === 1 ? "x1" : "cx", b = y === "x1" ? "y1" : "cy";
                        _.setAttribute(y, T[0]), _.setAttribute(b, T[1]), g && !d.g._collapsable && (d.of.setAttribute(y, T[0]), d.of.setAttribute(b, T[1]));
                    }
                    var w, j, M, I;
                    if (d.g._cmdf || S) {
                        w = d.cst;
                        var D = d.g.c;
                        for(M = w.length, j = 0; j < M; j += 1)I = w[j], I.setAttribute("offset", D[j * 4] + "%"), I.setAttribute("stop-color", "rgb(" + D[j * 4 + 1] + "," + D[j * 4 + 2] + "," + D[j * 4 + 3] + ")");
                    }
                    if (g && (d.g._omdf || S)) {
                        var B = d.g.o;
                        for(d.g._collapsable ? w = d.cst : w = d.ost, M = w.length, j = 0; j < M; j += 1)I = w[j], d.g._collapsable || I.setAttribute("offset", B[j * 2] + "%"), I.setAttribute("stop-opacity", B[j * 2 + 1]);
                    }
                    if (C.t === 1) (d.e._mdf || S) && (_.setAttribute("x2", x[0]), _.setAttribute("y2", x[1]), g && !d.g._collapsable && (d.of.setAttribute("x2", x[0]), d.of.setAttribute("y2", x[1])));
                    else {
                        var G;
                        if ((d.s._mdf || d.e._mdf || S) && (G = Math.sqrt(Math.pow(T[0] - x[0], 2) + Math.pow(T[1] - x[1], 2)), _.setAttribute("r", G), g && !d.g._collapsable && d.of.setAttribute("r", G)), d.s._mdf || d.e._mdf || d.h._mdf || d.a._mdf || S) {
                            G || (G = Math.sqrt(Math.pow(T[0] - x[0], 2) + Math.pow(T[1] - x[1], 2)));
                            var V = Math.atan2(x[1] - T[1], x[0] - T[0]), U = d.h.v;
                            U >= 1 ? U = .99 : U <= -1 && (U = -.99);
                            var W = G * U, z = Math.cos(V + d.a.v) * W + T[0], A = Math.sin(V + d.a.v) * W + T[1];
                            _.setAttribute("fx", z), _.setAttribute("fy", A), g && !d.g._collapsable && (d.of.setAttribute("fx", z), d.of.setAttribute("fy", A));
                        }
                    }
                }
                function v(C, d, S) {
                    var _ = d.style, g = d.d;
                    g && (g._mdf || S) && g.dashStr && (_.pElem.setAttribute("stroke-dasharray", g.dashStr), _.pElem.setAttribute("stroke-dashoffset", g.dashoffset[0])), d.c && (d.c._mdf || S) && _.pElem.setAttribute("stroke", "rgb(" + bmFloor(d.c.v[0]) + "," + bmFloor(d.c.v[1]) + "," + bmFloor(d.c.v[2]) + ")"), (d.o._mdf || S) && _.pElem.setAttribute("stroke-opacity", d.o.v), (d.w._mdf || S) && (_.pElem.setAttribute("stroke-width", d.w.v), _.msElem && _.msElem.setAttribute("stroke-width", d.w.v));
                }
                return r;
            }();
            function SVGShapeElement(e, t, r) {
                this.shapes = [], this.shapesData = e.shapes, this.stylesList = [], this.shapeModifiers = [], this.itemsData = [], this.processedElements = [], this.animatedContents = [], this.initElement(e, t, r), this.prevViewData = [];
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                SVGBaseElement,
                IShapeElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement
            ], SVGShapeElement), SVGShapeElement.prototype.initSecondaryElement = function() {}, SVGShapeElement.prototype.identityMatrix = new Matrix, SVGShapeElement.prototype.buildExpressionInterface = function() {}, SVGShapeElement.prototype.createContent = function() {
                this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, this.layerElement, 0, [], !0), this.filterUniqueShapes();
            }, SVGShapeElement.prototype.filterUniqueShapes = function() {
                var e, t = this.shapes.length, r, i, s = this.stylesList.length, a, o = [], h = !1;
                for(i = 0; i < s; i += 1){
                    for(a = this.stylesList[i], h = !1, o.length = 0, e = 0; e < t; e += 1)r = this.shapes[e], r.styles.indexOf(a) !== -1 && (o.push(r), h = r._isAnimated || h);
                    o.length > 1 && h && this.setShapesAsAnimated(o);
                }
            }, SVGShapeElement.prototype.setShapesAsAnimated = function(e) {
                var t, r = e.length;
                for(t = 0; t < r; t += 1)e[t].setAsAnimated();
            }, SVGShapeElement.prototype.createStyleElement = function(e, t) {
                var r, i = new SVGStyleData(e, t), s = i.pElem;
                if (e.ty === "st") r = new SVGStrokeStyleData(this, e, i);
                else if (e.ty === "fl") r = new SVGFillStyleData(this, e, i);
                else if (e.ty === "gf" || e.ty === "gs") {
                    var a = e.ty === "gf" ? SVGGradientFillStyleData : SVGGradientStrokeStyleData;
                    r = new a(this, e, i), this.globalData.defs.appendChild(r.gf), r.maskId && (this.globalData.defs.appendChild(r.ms), this.globalData.defs.appendChild(r.of), s.setAttribute("mask", "url(" + getLocationHref() + "#" + r.maskId + ")"));
                } else e.ty === "no" && (r = new SVGNoStyleData(this, e, i));
                return (e.ty === "st" || e.ty === "gs") && (s.setAttribute("stroke-linecap", lineCapEnum[e.lc || 2]), s.setAttribute("stroke-linejoin", lineJoinEnum[e.lj || 2]), s.setAttribute("fill-opacity", "0"), e.lj === 1 && s.setAttribute("stroke-miterlimit", e.ml)), e.r === 2 && s.setAttribute("fill-rule", "evenodd"), e.ln && s.setAttribute("id", e.ln), e.cl && s.setAttribute("class", e.cl), e.bm && (s.style["mix-blend-mode"] = getBlendMode(e.bm)), this.stylesList.push(i), this.addToAnimatedContents(e, r), r;
            }, SVGShapeElement.prototype.createGroupElement = function(e) {
                var t = new ShapeGroupData;
                return e.ln && t.gr.setAttribute("id", e.ln), e.cl && t.gr.setAttribute("class", e.cl), e.bm && (t.gr.style["mix-blend-mode"] = getBlendMode(e.bm)), t;
            }, SVGShapeElement.prototype.createTransformElement = function(e, t) {
                var r = TransformPropertyFactory.getTransformProperty(this, e, this), i = new SVGTransformData(r, r.o, t);
                return this.addToAnimatedContents(e, i), i;
            }, SVGShapeElement.prototype.createShapeElement = function(e, t, r) {
                var i = 4;
                e.ty === "rc" ? i = 5 : e.ty === "el" ? i = 6 : e.ty === "sr" && (i = 7);
                var s = ShapePropertyFactory.getShapeProp(this, e, i, this), a = new SVGShapeData(t, r, s);
                return this.shapes.push(a), this.addShapeToModifiers(a), this.addToAnimatedContents(e, a), a;
            }, SVGShapeElement.prototype.addToAnimatedContents = function(e, t) {
                for(var r = 0, i = this.animatedContents.length; r < i;){
                    if (this.animatedContents[r].element === t) return;
                    r += 1;
                }
                this.animatedContents.push({
                    fn: SVGElementsRenderer.createRenderFunction(e),
                    element: t,
                    data: e
                });
            }, SVGShapeElement.prototype.setElementStyles = function(e) {
                var t = e.styles, r, i = this.stylesList.length;
                for(r = 0; r < i; r += 1)t.indexOf(this.stylesList[r]) === -1 && !this.stylesList[r].closed && t.push(this.stylesList[r]);
            }, SVGShapeElement.prototype.reloadShapes = function() {
                this._isFirstFrame = !0;
                var e, t = this.itemsData.length;
                for(e = 0; e < t; e += 1)this.prevViewData[e] = this.itemsData[e];
                for(this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, this.layerElement, 0, [], !0), this.filterUniqueShapes(), t = this.dynamicProperties.length, e = 0; e < t; e += 1)this.dynamicProperties[e].getValue();
                this.renderModifiers();
            }, SVGShapeElement.prototype.searchShapes = function(e, t, r, i, s, a, o) {
                var h = [].concat(a), c, u = e.length - 1, v, C, d = [], S = [], _, g, T;
                for(c = u; c >= 0; c -= 1){
                    if (T = this.searchProcessedElement(e[c]), T ? t[c] = r[T - 1] : e[c]._render = o, e[c].ty === "fl" || e[c].ty === "st" || e[c].ty === "gf" || e[c].ty === "gs" || e[c].ty === "no") T ? t[c].style.closed = e[c].hd : t[c] = this.createStyleElement(e[c], s), e[c]._render && t[c].style.pElem.parentNode !== i && i.appendChild(t[c].style.pElem), d.push(t[c].style);
                    else if (e[c].ty === "gr") {
                        if (!T) t[c] = this.createGroupElement(e[c]);
                        else for(C = t[c].it.length, v = 0; v < C; v += 1)t[c].prevViewData[v] = t[c].it[v];
                        this.searchShapes(e[c].it, t[c].it, t[c].prevViewData, t[c].gr, s + 1, h, o), e[c]._render && t[c].gr.parentNode !== i && i.appendChild(t[c].gr);
                    } else e[c].ty === "tr" ? (T || (t[c] = this.createTransformElement(e[c], i)), _ = t[c].transform, h.push(_)) : e[c].ty === "sh" || e[c].ty === "rc" || e[c].ty === "el" || e[c].ty === "sr" ? (T || (t[c] = this.createShapeElement(e[c], h, s)), this.setElementStyles(t[c])) : e[c].ty === "tm" || e[c].ty === "rd" || e[c].ty === "ms" || e[c].ty === "pb" || e[c].ty === "zz" || e[c].ty === "op" ? (T ? (g = t[c], g.closed = !1) : (g = ShapeModifiers.getModifier(e[c].ty), g.init(this, e[c]), t[c] = g, this.shapeModifiers.push(g)), S.push(g)) : e[c].ty === "rp" && (T ? (g = t[c], g.closed = !0) : (g = ShapeModifiers.getModifier(e[c].ty), t[c] = g, g.init(this, e, c, t), this.shapeModifiers.push(g), o = !1), S.push(g));
                    this.addProcessedElement(e[c], c + 1);
                }
                for(u = d.length, c = 0; c < u; c += 1)d[c].closed = !0;
                for(u = S.length, c = 0; c < u; c += 1)S[c].closed = !0;
            }, SVGShapeElement.prototype.renderInnerContent = function() {
                this.renderModifiers();
                var e, t = this.stylesList.length;
                for(e = 0; e < t; e += 1)this.stylesList[e].reset();
                for(this.renderShape(), e = 0; e < t; e += 1)(this.stylesList[e]._mdf || this._isFirstFrame) && (this.stylesList[e].msElem && (this.stylesList[e].msElem.setAttribute("d", this.stylesList[e].d), this.stylesList[e].d = "M0 0" + this.stylesList[e].d), this.stylesList[e].pElem.setAttribute("d", this.stylesList[e].d || "M0 0"));
            }, SVGShapeElement.prototype.renderShape = function() {
                var e, t = this.animatedContents.length, r;
                for(e = 0; e < t; e += 1)r = this.animatedContents[e], (this._isFirstFrame || r.element._isAnimated) && r.data !== !0 && r.fn(r.data, r.element, this._isFirstFrame);
            }, SVGShapeElement.prototype.destroy = function() {
                this.destroyBaseElement(), this.shapesData = null, this.itemsData = null;
            };
            function LetterProps(e, t, r, i, s, a) {
                this.o = e, this.sw = t, this.sc = r, this.fc = i, this.m = s, this.p = a, this._mdf = {
                    o: !0,
                    sw: !!t,
                    sc: !!r,
                    fc: !!i,
                    m: !0,
                    p: !0
                };
            }
            LetterProps.prototype.update = function(e, t, r, i, s, a) {
                this._mdf.o = !1, this._mdf.sw = !1, this._mdf.sc = !1, this._mdf.fc = !1, this._mdf.m = !1, this._mdf.p = !1;
                var o = !1;
                return this.o !== e && (this.o = e, this._mdf.o = !0, o = !0), this.sw !== t && (this.sw = t, this._mdf.sw = !0, o = !0), this.sc !== r && (this.sc = r, this._mdf.sc = !0, o = !0), this.fc !== i && (this.fc = i, this._mdf.fc = !0, o = !0), this.m !== s && (this.m = s, this._mdf.m = !0, o = !0), a.length && (this.p[0] !== a[0] || this.p[1] !== a[1] || this.p[4] !== a[4] || this.p[5] !== a[5] || this.p[12] !== a[12] || this.p[13] !== a[13]) && (this.p = a, this._mdf.p = !0, o = !0), o;
            };
            function TextProperty(e, t) {
                this._frameId = initialDefaultFrame, this.pv = "", this.v = "", this.kf = !1, this._isFirstFrame = !0, this._mdf = !1, t.d && t.d.sid && (t.d = e.globalData.slotManager.getProp(t.d)), this.data = t, this.elem = e, this.comp = this.elem.comp, this.keysIndex = 0, this.canResize = !1, this.minimumFontSize = 1, this.effectsSequence = [], this.currentData = {
                    ascent: 0,
                    boxWidth: this.defaultBoxWidth,
                    f: "",
                    fStyle: "",
                    fWeight: "",
                    fc: "",
                    j: "",
                    justifyOffset: "",
                    l: [],
                    lh: 0,
                    lineWidths: [],
                    ls: "",
                    of: "",
                    s: "",
                    sc: "",
                    sw: 0,
                    t: 0,
                    tr: 0,
                    sz: 0,
                    ps: null,
                    fillColorAnim: !1,
                    strokeColorAnim: !1,
                    strokeWidthAnim: !1,
                    yOffset: 0,
                    finalSize: 0,
                    finalText: [],
                    finalLineHeight: 0,
                    __complete: !1
                }, this.copyData(this.currentData, this.data.d.k[0].s), this.searchProperty() || this.completeTextData(this.currentData);
            }
            TextProperty.prototype.defaultBoxWidth = [
                0,
                0
            ], TextProperty.prototype.copyData = function(e, t) {
                for(var r in t)Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r]);
                return e;
            }, TextProperty.prototype.setCurrentData = function(e) {
                e.__complete || this.completeTextData(e), this.currentData = e, this.currentData.boxWidth = this.currentData.boxWidth || this.defaultBoxWidth, this._mdf = !0;
            }, TextProperty.prototype.searchProperty = function() {
                return this.searchKeyframes();
            }, TextProperty.prototype.searchKeyframes = function() {
                return this.kf = this.data.d.k.length > 1, this.kf && this.addEffect(this.getKeyframeValue.bind(this)), this.kf;
            }, TextProperty.prototype.addEffect = function(e) {
                this.effectsSequence.push(e), this.elem.addDynamicProperty(this);
            }, TextProperty.prototype.getValue = function(e) {
                if (!((this.elem.globalData.frameId === this.frameId || !this.effectsSequence.length) && !e)) {
                    this.currentData.t = this.data.d.k[this.keysIndex].s.t;
                    var t = this.currentData, r = this.keysIndex;
                    if (this.lock) {
                        this.setCurrentData(this.currentData);
                        return;
                    }
                    this.lock = !0, this._mdf = !1;
                    var i, s = this.effectsSequence.length, a = e || this.data.d.k[this.keysIndex].s;
                    for(i = 0; i < s; i += 1)r !== this.keysIndex ? a = this.effectsSequence[i](a, a.t) : a = this.effectsSequence[i](this.currentData, a.t);
                    t !== a && this.setCurrentData(a), this.v = this.currentData, this.pv = this.v, this.lock = !1, this.frameId = this.elem.globalData.frameId;
                }
            }, TextProperty.prototype.getKeyframeValue = function() {
                for(var e = this.data.d.k, t = this.elem.comp.renderedFrame, r = 0, i = e.length; r <= i - 1 && !(r === i - 1 || e[r + 1].t > t);)r += 1;
                return this.keysIndex !== r && (this.keysIndex = r), this.data.d.k[this.keysIndex].s;
            }, TextProperty.prototype.buildFinalText = function(e) {
                for(var t = [], r = 0, i = e.length, s, a, o = !1, h = !1, c = ""; r < i;)o = h, h = !1, s = e.charCodeAt(r), c = e.charAt(r), FontManager.isCombinedCharacter(s) ? o = !0 : s >= 55296 && s <= 56319 ? FontManager.isRegionalFlag(e, r) ? c = e.substr(r, 14) : (a = e.charCodeAt(r + 1), a >= 56320 && a <= 57343 && (FontManager.isModifier(s, a) ? (c = e.substr(r, 2), o = !0) : FontManager.isFlagEmoji(e.substr(r, 4)) ? c = e.substr(r, 4) : c = e.substr(r, 2))) : s > 56319 ? (a = e.charCodeAt(r + 1), FontManager.isVariationSelector(s) && (o = !0)) : FontManager.isZeroWidthJoiner(s) && (o = !0, h = !0), o ? (t[t.length - 1] += c, o = !1) : t.push(c), r += c.length;
                return t;
            }, TextProperty.prototype.completeTextData = function(e) {
                e.__complete = !0;
                var t = this.elem.globalData.fontManager, r = this.data, i = [], s, a, o, h = 0, c, u = r.m.g, v = 0, C = 0, d = 0, S = [], _ = 0, g = 0, T, x, E = t.getFontByName(e.f), y, b = 0, w = getFontProperties(E);
                e.fWeight = w.weight, e.fStyle = w.style, e.finalSize = e.s, e.finalText = this.buildFinalText(e.t), a = e.finalText.length, e.finalLineHeight = e.lh;
                var j = e.tr / 1e3 * e.finalSize, M;
                if (e.sz) for(var I = !0, D = e.sz[0], B = e.sz[1], G, V; I;){
                    V = this.buildFinalText(e.t), G = 0, _ = 0, a = V.length, j = e.tr / 1e3 * e.finalSize;
                    var U = -1;
                    for(s = 0; s < a; s += 1)M = V[s].charCodeAt(0), o = !1, V[s] === " " ? U = s : (M === 13 || M === 3) && (_ = 0, o = !0, G += e.finalLineHeight || e.finalSize * 1.2), t.chars ? (y = t.getCharData(V[s], E.fStyle, E.fFamily), b = o ? 0 : y.w * e.finalSize / 100) : b = t.measureText(V[s], e.f, e.finalSize), _ + b > D && V[s] !== " " ? (U === -1 ? a += 1 : s = U, G += e.finalLineHeight || e.finalSize * 1.2, V.splice(s, U === s ? 1 : 0, "\r"), U = -1, _ = 0) : (_ += b, _ += j);
                    G += E.ascent * e.finalSize / 100, this.canResize && e.finalSize > this.minimumFontSize && B < G ? (e.finalSize -= 1, e.finalLineHeight = e.finalSize * e.lh / e.s) : (e.finalText = V, a = e.finalText.length, I = !1);
                }
                _ = -j, b = 0;
                var W = 0, z;
                for(s = 0; s < a; s += 1)if (o = !1, z = e.finalText[s], M = z.charCodeAt(0), M === 13 || M === 3 ? (W = 0, S.push(_), g = _ > g ? _ : g, _ = -2 * j, c = "", o = !0, d += 1) : c = z, t.chars ? (y = t.getCharData(z, E.fStyle, t.getFontByName(e.f).fFamily), b = o ? 0 : y.w * e.finalSize / 100) : b = t.measureText(c, e.f, e.finalSize), z === " " ? W += b + j : (_ += b + j + W, W = 0), i.push({
                    l: b,
                    an: b,
                    add: v,
                    n: o,
                    anIndexes: [],
                    val: c,
                    line: d,
                    animatorJustifyOffset: 0
                }), u == 2) {
                    if (v += b, c === "" || c === " " || s === a - 1) {
                        for((c === "" || c === " ") && (v -= b); C <= s;)i[C].an = v, i[C].ind = h, i[C].extra = b, C += 1;
                        h += 1, v = 0;
                    }
                } else if (u == 3) {
                    if (v += b, c === "" || s === a - 1) {
                        for(c === "" && (v -= b); C <= s;)i[C].an = v, i[C].ind = h, i[C].extra = b, C += 1;
                        v = 0, h += 1;
                    }
                } else i[h].ind = h, i[h].extra = 0, h += 1;
                if (e.l = i, g = _ > g ? _ : g, S.push(_), e.sz) e.boxWidth = e.sz[0], e.justifyOffset = 0;
                else switch(e.boxWidth = g, e.j){
                    case 1:
                        e.justifyOffset = -e.boxWidth;
                        break;
                    case 2:
                        e.justifyOffset = -e.boxWidth / 2;
                        break;
                    default:
                        e.justifyOffset = 0;
                }
                e.lineWidths = S;
                var A = r.a, F, P;
                x = A.length;
                var R, L, N = [];
                for(T = 0; T < x; T += 1){
                    for(F = A[T], F.a.sc && (e.strokeColorAnim = !0), F.a.sw && (e.strokeWidthAnim = !0), (F.a.fc || F.a.fh || F.a.fs || F.a.fb) && (e.fillColorAnim = !0), L = 0, R = F.s.b, s = 0; s < a; s += 1)P = i[s], P.anIndexes[T] = L, (R == 1 && P.val !== "" || R == 2 && P.val !== "" && P.val !== " " || R == 3 && (P.n || P.val == " " || s == a - 1) || R == 4 && (P.n || s == a - 1)) && (F.s.rn === 1 && N.push(L), L += 1);
                    r.a[T].s.totalChars = L;
                    var $ = -1, O;
                    if (F.s.rn === 1) for(s = 0; s < a; s += 1)P = i[s], $ != P.anIndexes[T] && ($ = P.anIndexes[T], O = N.splice(Math.floor(Math.random() * N.length), 1)[0]), P.anIndexes[T] = O;
                }
                e.yOffset = e.finalLineHeight || e.finalSize * 1.2, e.ls = e.ls || 0, e.ascent = E.ascent * e.finalSize / 100;
            }, TextProperty.prototype.updateDocumentData = function(e, t) {
                t = t === void 0 ? this.keysIndex : t;
                var r = this.copyData({}, this.data.d.k[t].s);
                r = this.copyData(r, e), this.data.d.k[t].s = r, this.recalculate(t), this.setCurrentData(r), this.elem.addDynamicProperty(this);
            }, TextProperty.prototype.recalculate = function(e) {
                var t = this.data.d.k[e].s;
                t.__complete = !1, this.keysIndex = 0, this._isFirstFrame = !0, this.getValue(t);
            }, TextProperty.prototype.canResizeFont = function(e) {
                this.canResize = e, this.recalculate(this.keysIndex), this.elem.addDynamicProperty(this);
            }, TextProperty.prototype.setMinimumFontSize = function(e) {
                this.minimumFontSize = Math.floor(e) || 1, this.recalculate(this.keysIndex), this.elem.addDynamicProperty(this);
            };
            var TextSelectorProp = function() {
                var e = Math.max, t = Math.min, r = Math.floor;
                function i(a, o) {
                    this._currentTextLength = -1, this.k = !1, this.data = o, this.elem = a, this.comp = a.comp, this.finalS = 0, this.finalE = 0, this.initDynamicPropertyContainer(a), this.s = PropertyFactory.getProp(a, o.s || {
                        k: 0
                    }, 0, 0, this), "e" in o ? this.e = PropertyFactory.getProp(a, o.e, 0, 0, this) : this.e = {
                        v: 100
                    }, this.o = PropertyFactory.getProp(a, o.o || {
                        k: 0
                    }, 0, 0, this), this.xe = PropertyFactory.getProp(a, o.xe || {
                        k: 0
                    }, 0, 0, this), this.ne = PropertyFactory.getProp(a, o.ne || {
                        k: 0
                    }, 0, 0, this), this.sm = PropertyFactory.getProp(a, o.sm || {
                        k: 100
                    }, 0, 0, this), this.a = PropertyFactory.getProp(a, o.a, 0, .01, this), this.dynamicProperties.length || this.getValue();
                }
                i.prototype = {
                    getMult: function(o) {
                        this._currentTextLength !== this.elem.textProperty.currentData.l.length && this.getValue();
                        var h = 0, c = 0, u = 1, v = 1;
                        this.ne.v > 0 ? h = this.ne.v / 100 : c = -this.ne.v / 100, this.xe.v > 0 ? u = 1 - this.xe.v / 100 : v = 1 + this.xe.v / 100;
                        var C = BezierFactory.getBezierEasing(h, c, u, v).get, d = 0, S = this.finalS, _ = this.finalE, g = this.data.sh;
                        if (g === 2) _ === S ? d = o >= _ ? 1 : 0 : d = e(0, t(.5 / (_ - S) + (o - S) / (_ - S), 1)), d = C(d);
                        else if (g === 3) _ === S ? d = o >= _ ? 0 : 1 : d = 1 - e(0, t(.5 / (_ - S) + (o - S) / (_ - S), 1)), d = C(d);
                        else if (g === 4) _ === S ? d = 0 : (d = e(0, t(.5 / (_ - S) + (o - S) / (_ - S), 1)), d < .5 ? d *= 2 : d = 1 - 2 * (d - .5)), d = C(d);
                        else if (g === 5) {
                            if (_ === S) d = 0;
                            else {
                                var T = _ - S;
                                o = t(e(0, o + .5 - S), _ - S);
                                var x = -T / 2 + o, E = T / 2;
                                d = Math.sqrt(1 - x * x / (E * E));
                            }
                            d = C(d);
                        } else g === 6 ? (_ === S ? d = 0 : (o = t(e(0, o + .5 - S), _ - S), d = (1 + Math.cos(Math.PI + Math.PI * 2 * o / (_ - S))) / 2), d = C(d)) : (o >= r(S) && (o - S < 0 ? d = e(0, t(t(_, 1) - (S - o), 1)) : d = e(0, t(_ - o, 1))), d = C(d));
                        if (this.sm.v !== 100) {
                            var y = this.sm.v * .01;
                            y === 0 && (y = 1e-8);
                            var b = .5 - y * .5;
                            d < b ? d = 0 : (d = (d - b) / y, d > 1 && (d = 1));
                        }
                        return d * this.a.v;
                    },
                    getValue: function(o) {
                        this.iterateDynamicProperties(), this._mdf = o || this._mdf, this._currentTextLength = this.elem.textProperty.currentData.l.length || 0, o && this.data.r === 2 && (this.e.v = this._currentTextLength);
                        var h = this.data.r === 2 ? 1 : 100 / this.data.totalChars, c = this.o.v / h, u = this.s.v / h + c, v = this.e.v / h + c;
                        if (u > v) {
                            var C = u;
                            u = v, v = C;
                        }
                        this.finalS = u, this.finalE = v;
                    }
                }, extendPrototype([
                    DynamicPropertyContainer
                ], i);
                function s(a, o, h) {
                    return new i(a, o);
                }
                return {
                    getTextSelectorProp: s
                };
            }();
            function TextAnimatorDataProperty(e, t, r) {
                var i = {
                    propType: !1
                }, s = PropertyFactory.getProp, a = t.a;
                this.a = {
                    r: a.r ? s(e, a.r, 0, degToRads, r) : i,
                    rx: a.rx ? s(e, a.rx, 0, degToRads, r) : i,
                    ry: a.ry ? s(e, a.ry, 0, degToRads, r) : i,
                    sk: a.sk ? s(e, a.sk, 0, degToRads, r) : i,
                    sa: a.sa ? s(e, a.sa, 0, degToRads, r) : i,
                    s: a.s ? s(e, a.s, 1, .01, r) : i,
                    a: a.a ? s(e, a.a, 1, 0, r) : i,
                    o: a.o ? s(e, a.o, 0, .01, r) : i,
                    p: a.p ? s(e, a.p, 1, 0, r) : i,
                    sw: a.sw ? s(e, a.sw, 0, 0, r) : i,
                    sc: a.sc ? s(e, a.sc, 1, 0, r) : i,
                    fc: a.fc ? s(e, a.fc, 1, 0, r) : i,
                    fh: a.fh ? s(e, a.fh, 0, 0, r) : i,
                    fs: a.fs ? s(e, a.fs, 0, .01, r) : i,
                    fb: a.fb ? s(e, a.fb, 0, .01, r) : i,
                    t: a.t ? s(e, a.t, 0, 0, r) : i
                }, this.s = TextSelectorProp.getTextSelectorProp(e, t.s, r), this.s.t = t.s.t;
            }
            function TextAnimatorProperty(e, t, r) {
                this._isFirstFrame = !0, this._hasMaskedPath = !1, this._frameId = -1, this._textData = e, this._renderType = t, this._elem = r, this._animatorsData = createSizedArray(this._textData.a.length), this._pathData = {}, this._moreOptions = {
                    alignment: {}
                }, this.renderedLetters = [], this.lettersChangedFlag = !1, this.initDynamicPropertyContainer(r);
            }
            TextAnimatorProperty.prototype.searchProperties = function() {
                var e, t = this._textData.a.length, r, i = PropertyFactory.getProp;
                for(e = 0; e < t; e += 1)r = this._textData.a[e], this._animatorsData[e] = new TextAnimatorDataProperty(this._elem, r, this);
                this._textData.p && "m" in this._textData.p ? (this._pathData = {
                    a: i(this._elem, this._textData.p.a, 0, 0, this),
                    f: i(this._elem, this._textData.p.f, 0, 0, this),
                    l: i(this._elem, this._textData.p.l, 0, 0, this),
                    r: i(this._elem, this._textData.p.r, 0, 0, this),
                    p: i(this._elem, this._textData.p.p, 0, 0, this),
                    m: this._elem.maskManager.getMaskProperty(this._textData.p.m)
                }, this._hasMaskedPath = !0) : this._hasMaskedPath = !1, this._moreOptions.alignment = i(this._elem, this._textData.m.a, 1, 0, this);
            }, TextAnimatorProperty.prototype.getMeasures = function(e, t) {
                if (this.lettersChangedFlag = t, !(!this._mdf && !this._isFirstFrame && !t && (!this._hasMaskedPath || !this._pathData.m._mdf))) {
                    this._isFirstFrame = !1;
                    var r = this._moreOptions.alignment.v, i = this._animatorsData, s = this._textData, a = this.mHelper, o = this._renderType, h = this.renderedLetters.length, c, u, v, C, d = e.l, S, _, g, T, x, E, y, b, w, j, M, I, D, B, G;
                    if (this._hasMaskedPath) {
                        if (G = this._pathData.m, !this._pathData.n || this._pathData._mdf) {
                            var V = G.v;
                            this._pathData.r.v && (V = V.reverse()), S = {
                                tLength: 0,
                                segments: []
                            }, C = V._length - 1;
                            var U;
                            for(I = 0, v = 0; v < C; v += 1)U = bez.buildBezierData(V.v[v], V.v[v + 1], [
                                V.o[v][0] - V.v[v][0],
                                V.o[v][1] - V.v[v][1]
                            ], [
                                V.i[v + 1][0] - V.v[v + 1][0],
                                V.i[v + 1][1] - V.v[v + 1][1]
                            ]), S.tLength += U.segmentLength, S.segments.push(U), I += U.segmentLength;
                            v = C, G.v.c && (U = bez.buildBezierData(V.v[v], V.v[0], [
                                V.o[v][0] - V.v[v][0],
                                V.o[v][1] - V.v[v][1]
                            ], [
                                V.i[0][0] - V.v[0][0],
                                V.i[0][1] - V.v[0][1]
                            ]), S.tLength += U.segmentLength, S.segments.push(U), I += U.segmentLength), this._pathData.pi = S;
                        }
                        if (S = this._pathData.pi, _ = this._pathData.f.v, y = 0, E = 1, T = 0, x = !0, j = S.segments, _ < 0 && G.v.c) for(S.tLength < Math.abs(_) && (_ = -Math.abs(_) % S.tLength), y = j.length - 1, w = j[y].points, E = w.length - 1; _ < 0;)_ += w[E].partialLength, E -= 1, E < 0 && (y -= 1, w = j[y].points, E = w.length - 1);
                        w = j[y].points, b = w[E - 1], g = w[E], M = g.partialLength;
                    }
                    C = d.length, c = 0, u = 0;
                    var W = e.finalSize * 1.2 * .714, z = !0, A, F, P, R, L;
                    R = i.length;
                    var N, $ = -1, O, H, Y, Z = _, ee = y, re = E, ne = -1, ie, J, te, Q, K, ce, ue, he, le = "", pe = this.defaultPropsArray, fe;
                    if (e.j === 2 || e.j === 1) {
                        var se = 0, de = 0, me = e.j === 2 ? -.5 : -1, ae = 0, ve = !0;
                        for(v = 0; v < C; v += 1)if (d[v].n) {
                            for(se && (se += de); ae < v;)d[ae].animatorJustifyOffset = se, ae += 1;
                            se = 0, ve = !0;
                        } else {
                            for(P = 0; P < R; P += 1)A = i[P].a, A.t.propType && (ve && e.j === 2 && (de += A.t.v * me), F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), N.length ? se += A.t.v * N[0] * me : se += A.t.v * N * me);
                            ve = !1;
                        }
                        for(se && (se += de); ae < v;)d[ae].animatorJustifyOffset = se, ae += 1;
                    }
                    for(v = 0; v < C; v += 1){
                        if (a.reset(), ie = 1, d[v].n) c = 0, u += e.yOffset, u += z ? 1 : 0, _ = Z, z = !1, this._hasMaskedPath && (y = ee, E = re, w = j[y].points, b = w[E - 1], g = w[E], M = g.partialLength, T = 0), le = "", he = "", ce = "", fe = "", pe = this.defaultPropsArray;
                        else {
                            if (this._hasMaskedPath) {
                                if (ne !== d[v].line) {
                                    switch(e.j){
                                        case 1:
                                            _ += I - e.lineWidths[d[v].line];
                                            break;
                                        case 2:
                                            _ += (I - e.lineWidths[d[v].line]) / 2;
                                            break;
                                    }
                                    ne = d[v].line;
                                }
                                $ !== d[v].ind && (d[$] && (_ += d[$].extra), _ += d[v].an / 2, $ = d[v].ind), _ += r[0] * d[v].an * .005;
                                var oe = 0;
                                for(P = 0; P < R; P += 1)A = i[P].a, A.p.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), N.length ? oe += A.p.v[0] * N[0] : oe += A.p.v[0] * N), A.a.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), N.length ? oe += A.a.v[0] * N[0] : oe += A.a.v[0] * N);
                                for(x = !0, this._pathData.a.v && (_ = d[0].an * .5 + (I - this._pathData.f.v - d[0].an * .5 - d[d.length - 1].an * .5) * $ / (C - 1), _ += this._pathData.f.v); x;)T + M >= _ + oe || !w ? (D = (_ + oe - T) / g.partialLength, H = b.point[0] + (g.point[0] - b.point[0]) * D, Y = b.point[1] + (g.point[1] - b.point[1]) * D, a.translate(-r[0] * d[v].an * .005, -(r[1] * W) * .01), x = !1) : w && (T += g.partialLength, E += 1, E >= w.length && (E = 0, y += 1, j[y] ? w = j[y].points : G.v.c ? (E = 0, y = 0, w = j[y].points) : (T -= g.partialLength, w = null)), w && (b = g, g = w[E], M = g.partialLength));
                                O = d[v].an / 2 - d[v].add, a.translate(-O, 0, 0);
                            } else O = d[v].an / 2 - d[v].add, a.translate(-O, 0, 0), a.translate(-r[0] * d[v].an * .005, -r[1] * W * .01, 0);
                            for(P = 0; P < R; P += 1)A = i[P].a, A.t.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), (c !== 0 || e.j !== 0) && (this._hasMaskedPath ? N.length ? _ += A.t.v * N[0] : _ += A.t.v * N : N.length ? c += A.t.v * N[0] : c += A.t.v * N));
                            for(e.strokeWidthAnim && (te = e.sw || 0), e.strokeColorAnim && (e.sc ? J = [
                                e.sc[0],
                                e.sc[1],
                                e.sc[2]
                            ] : J = [
                                0,
                                0,
                                0
                            ]), e.fillColorAnim && e.fc && (Q = [
                                e.fc[0],
                                e.fc[1],
                                e.fc[2]
                            ]), P = 0; P < R; P += 1)A = i[P].a, A.a.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), N.length ? a.translate(-A.a.v[0] * N[0], -A.a.v[1] * N[1], A.a.v[2] * N[2]) : a.translate(-A.a.v[0] * N, -A.a.v[1] * N, A.a.v[2] * N));
                            for(P = 0; P < R; P += 1)A = i[P].a, A.s.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), N.length ? a.scale(1 + (A.s.v[0] - 1) * N[0], 1 + (A.s.v[1] - 1) * N[1], 1) : a.scale(1 + (A.s.v[0] - 1) * N, 1 + (A.s.v[1] - 1) * N, 1));
                            for(P = 0; P < R; P += 1){
                                if (A = i[P].a, F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), A.sk.propType && (N.length ? a.skewFromAxis(-A.sk.v * N[0], A.sa.v * N[1]) : a.skewFromAxis(-A.sk.v * N, A.sa.v * N)), A.r.propType && (N.length ? a.rotateZ(-A.r.v * N[2]) : a.rotateZ(-A.r.v * N)), A.ry.propType && (N.length ? a.rotateY(A.ry.v * N[1]) : a.rotateY(A.ry.v * N)), A.rx.propType && (N.length ? a.rotateX(A.rx.v * N[0]) : a.rotateX(A.rx.v * N)), A.o.propType && (N.length ? ie += (A.o.v * N[0] - ie) * N[0] : ie += (A.o.v * N - ie) * N), e.strokeWidthAnim && A.sw.propType && (N.length ? te += A.sw.v * N[0] : te += A.sw.v * N), e.strokeColorAnim && A.sc.propType) for(K = 0; K < 3; K += 1)N.length ? J[K] += (A.sc.v[K] - J[K]) * N[0] : J[K] += (A.sc.v[K] - J[K]) * N;
                                if (e.fillColorAnim && e.fc) {
                                    if (A.fc.propType) for(K = 0; K < 3; K += 1)N.length ? Q[K] += (A.fc.v[K] - Q[K]) * N[0] : Q[K] += (A.fc.v[K] - Q[K]) * N;
                                    A.fh.propType && (N.length ? Q = addHueToRGB(Q, A.fh.v * N[0]) : Q = addHueToRGB(Q, A.fh.v * N)), A.fs.propType && (N.length ? Q = addSaturationToRGB(Q, A.fs.v * N[0]) : Q = addSaturationToRGB(Q, A.fs.v * N)), A.fb.propType && (N.length ? Q = addBrightnessToRGB(Q, A.fb.v * N[0]) : Q = addBrightnessToRGB(Q, A.fb.v * N));
                                }
                            }
                            for(P = 0; P < R; P += 1)A = i[P].a, A.p.propType && (F = i[P].s, N = F.getMult(d[v].anIndexes[P], s.a[P].s.totalChars), this._hasMaskedPath ? N.length ? a.translate(0, A.p.v[1] * N[0], -A.p.v[2] * N[1]) : a.translate(0, A.p.v[1] * N, -A.p.v[2] * N) : N.length ? a.translate(A.p.v[0] * N[0], A.p.v[1] * N[1], -A.p.v[2] * N[2]) : a.translate(A.p.v[0] * N, A.p.v[1] * N, -A.p.v[2] * N));
                            if (e.strokeWidthAnim && (ce = te < 0 ? 0 : te), e.strokeColorAnim && (ue = "rgb(" + Math.round(J[0] * 255) + "," + Math.round(J[1] * 255) + "," + Math.round(J[2] * 255) + ")"), e.fillColorAnim && e.fc && (he = "rgb(" + Math.round(Q[0] * 255) + "," + Math.round(Q[1] * 255) + "," + Math.round(Q[2] * 255) + ")"), this._hasMaskedPath) {
                                if (a.translate(0, -e.ls), a.translate(0, r[1] * W * .01 + u, 0), this._pathData.p.v) {
                                    B = (g.point[1] - b.point[1]) / (g.point[0] - b.point[0]);
                                    var ge = Math.atan(B) * 180 / Math.PI;
                                    g.point[0] < b.point[0] && (ge += 180), a.rotate(-ge * Math.PI / 180);
                                }
                                a.translate(H, Y, 0), _ -= r[0] * d[v].an * .005, d[v + 1] && $ !== d[v + 1].ind && (_ += d[v].an / 2, _ += e.tr * .001 * e.finalSize);
                            } else {
                                switch(a.translate(c, u, 0), e.ps && a.translate(e.ps[0], e.ps[1] + e.ascent, 0), e.j){
                                    case 1:
                                        a.translate(d[v].animatorJustifyOffset + e.justifyOffset + (e.boxWidth - e.lineWidths[d[v].line]), 0, 0);
                                        break;
                                    case 2:
                                        a.translate(d[v].animatorJustifyOffset + e.justifyOffset + (e.boxWidth - e.lineWidths[d[v].line]) / 2, 0, 0);
                                        break;
                                }
                                a.translate(0, -e.ls), a.translate(O, 0, 0), a.translate(r[0] * d[v].an * .005, r[1] * W * .01, 0), c += d[v].l + e.tr * .001 * e.finalSize;
                            }
                            o === "html" ? le = a.toCSS() : o === "svg" ? le = a.to2dCSS() : pe = [
                                a.props[0],
                                a.props[1],
                                a.props[2],
                                a.props[3],
                                a.props[4],
                                a.props[5],
                                a.props[6],
                                a.props[7],
                                a.props[8],
                                a.props[9],
                                a.props[10],
                                a.props[11],
                                a.props[12],
                                a.props[13],
                                a.props[14],
                                a.props[15]
                            ], fe = ie;
                        }
                        h <= v ? (L = new LetterProps(fe, ce, ue, he, le, pe), this.renderedLetters.push(L), h += 1, this.lettersChangedFlag = !0) : (L = this.renderedLetters[v], this.lettersChangedFlag = L.update(fe, ce, ue, he, le, pe) || this.lettersChangedFlag);
                    }
                }
            }, TextAnimatorProperty.prototype.getValue = function() {
                this._elem.globalData.frameId !== this._frameId && (this._frameId = this._elem.globalData.frameId, this.iterateDynamicProperties());
            }, TextAnimatorProperty.prototype.mHelper = new Matrix, TextAnimatorProperty.prototype.defaultPropsArray = [], extendPrototype([
                DynamicPropertyContainer
            ], TextAnimatorProperty);
            function ITextElement() {}
            ITextElement.prototype.initElement = function(e, t, r) {
                this.lettersChangedFlag = !0, this.initFrame(), this.initBaseData(e, t, r), this.textProperty = new TextProperty(this, e.t, this.dynamicProperties), this.textAnimator = new TextAnimatorProperty(e.t, this.renderType, this), this.initTransform(e, t, r), this.initHierarchy(), this.initRenderable(), this.initRendererElement(), this.createContainerElements(), this.createRenderableComponents(), this.createContent(), this.hide(), this.textAnimator.searchProperties(this.dynamicProperties);
            }, ITextElement.prototype.prepareFrame = function(e) {
                this._mdf = !1, this.prepareRenderableFrame(e), this.prepareProperties(e, this.isInRange);
            }, ITextElement.prototype.createPathShape = function(e, t) {
                var r, i = t.length, s, a = "";
                for(r = 0; r < i; r += 1)t[r].ty === "sh" && (s = t[r].ks.k, a += buildShapeString(s, s.i.length, !0, e));
                return a;
            }, ITextElement.prototype.updateDocumentData = function(e, t) {
                this.textProperty.updateDocumentData(e, t);
            }, ITextElement.prototype.canResizeFont = function(e) {
                this.textProperty.canResizeFont(e);
            }, ITextElement.prototype.setMinimumFontSize = function(e) {
                this.textProperty.setMinimumFontSize(e);
            }, ITextElement.prototype.applyTextPropertiesToMatrix = function(e, t, r, i, s) {
                switch(e.ps && t.translate(e.ps[0], e.ps[1] + e.ascent, 0), t.translate(0, -e.ls, 0), e.j){
                    case 1:
                        t.translate(e.justifyOffset + (e.boxWidth - e.lineWidths[r]), 0, 0);
                        break;
                    case 2:
                        t.translate(e.justifyOffset + (e.boxWidth - e.lineWidths[r]) / 2, 0, 0);
                        break;
                }
                t.translate(i, s, 0);
            }, ITextElement.prototype.buildColor = function(e) {
                return "rgb(" + Math.round(e[0] * 255) + "," + Math.round(e[1] * 255) + "," + Math.round(e[2] * 255) + ")";
            }, ITextElement.prototype.emptyProp = new LetterProps, ITextElement.prototype.destroy = function() {}, ITextElement.prototype.validateText = function() {
                (this.textProperty._mdf || this.textProperty._isFirstFrame) && (this.buildNewText(), this.textProperty._isFirstFrame = !1, this.textProperty._mdf = !1);
            };
            var emptyShapeData = {
                shapes: []
            };
            function SVGTextLottieElement(e, t, r) {
                this.textSpans = [], this.renderType = "svg", this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                SVGBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement,
                ITextElement
            ], SVGTextLottieElement), SVGTextLottieElement.prototype.createContent = function() {
                this.data.singleShape && !this.globalData.fontManager.chars && (this.textContainer = createNS("text"));
            }, SVGTextLottieElement.prototype.buildTextContents = function(e) {
                for(var t = 0, r = e.length, i = [], s = ""; t < r;)e[t] === "\r" || e[t] === "" ? (i.push(s), s = "") : s += e[t], t += 1;
                return i.push(s), i;
            }, SVGTextLottieElement.prototype.buildShapeData = function(e, t) {
                if (e.shapes && e.shapes.length) {
                    var r = e.shapes[0];
                    if (r.it) {
                        var i = r.it[r.it.length - 1];
                        i.s && (i.s.k[0] = t, i.s.k[1] = t);
                    }
                }
                return e;
            }, SVGTextLottieElement.prototype.buildNewText = function() {
                this.addDynamicProperty(this);
                var e, t, r = this.textProperty.currentData;
                this.renderedLetters = createSizedArray(r ? r.l.length : 0), r.fc ? this.layerElement.setAttribute("fill", this.buildColor(r.fc)) : this.layerElement.setAttribute("fill", "rgba(0,0,0,0)"), r.sc && (this.layerElement.setAttribute("stroke", this.buildColor(r.sc)), this.layerElement.setAttribute("stroke-width", r.sw)), this.layerElement.setAttribute("font-size", r.finalSize);
                var i = this.globalData.fontManager.getFontByName(r.f);
                if (i.fClass) this.layerElement.setAttribute("class", i.fClass);
                else {
                    this.layerElement.setAttribute("font-family", i.fFamily);
                    var s = r.fWeight, a = r.fStyle;
                    this.layerElement.setAttribute("font-style", a), this.layerElement.setAttribute("font-weight", s);
                }
                this.layerElement.setAttribute("aria-label", r.t);
                var o = r.l || [], h = !!this.globalData.fontManager.chars;
                t = o.length;
                var c, u = this.mHelper, v = "", C = this.data.singleShape, d = 0, S = 0, _ = !0, g = r.tr * .001 * r.finalSize;
                if (C && !h && !r.sz) {
                    var T = this.textContainer, x = "start";
                    switch(r.j){
                        case 1:
                            x = "end";
                            break;
                        case 2:
                            x = "middle";
                            break;
                        default:
                            x = "start";
                            break;
                    }
                    T.setAttribute("text-anchor", x), T.setAttribute("letter-spacing", g);
                    var E = this.buildTextContents(r.finalText);
                    for(t = E.length, S = r.ps ? r.ps[1] + r.ascent : 0, e = 0; e < t; e += 1)c = this.textSpans[e].span || createNS("tspan"), c.textContent = E[e], c.setAttribute("x", 0), c.setAttribute("y", S), c.style.display = "inherit", T.appendChild(c), this.textSpans[e] || (this.textSpans[e] = {
                        span: null,
                        glyph: null
                    }), this.textSpans[e].span = c, S += r.finalLineHeight;
                    this.layerElement.appendChild(T);
                } else {
                    var y = this.textSpans.length, b;
                    for(e = 0; e < t; e += 1){
                        if (this.textSpans[e] || (this.textSpans[e] = {
                            span: null,
                            childSpan: null,
                            glyph: null
                        }), !h || !C || e === 0) {
                            if (c = y > e ? this.textSpans[e].span : createNS(h ? "g" : "text"), y <= e) {
                                if (c.setAttribute("stroke-linecap", "butt"), c.setAttribute("stroke-linejoin", "round"), c.setAttribute("stroke-miterlimit", "4"), this.textSpans[e].span = c, h) {
                                    var w = createNS("g");
                                    c.appendChild(w), this.textSpans[e].childSpan = w;
                                }
                                this.textSpans[e].span = c, this.layerElement.appendChild(c);
                            }
                            c.style.display = "inherit";
                        }
                        if (u.reset(), C && (o[e].n && (d = -g, S += r.yOffset, S += _ ? 1 : 0, _ = !1), this.applyTextPropertiesToMatrix(r, u, o[e].line, d, S), d += o[e].l || 0, d += g), h) {
                            b = this.globalData.fontManager.getCharData(r.finalText[e], i.fStyle, this.globalData.fontManager.getFontByName(r.f).fFamily);
                            var j;
                            if (b.t === 1) j = new SVGCompElement(b.data, this.globalData, this);
                            else {
                                var M = emptyShapeData;
                                b.data && b.data.shapes && (M = this.buildShapeData(b.data, r.finalSize)), j = new SVGShapeElement(M, this.globalData, this);
                            }
                            if (this.textSpans[e].glyph) {
                                var I = this.textSpans[e].glyph;
                                this.textSpans[e].childSpan.removeChild(I.layerElement), I.destroy();
                            }
                            this.textSpans[e].glyph = j, j._debug = !0, j.prepareFrame(0), j.renderFrame(), this.textSpans[e].childSpan.appendChild(j.layerElement), b.t === 1 && this.textSpans[e].childSpan.setAttribute("transform", "scale(" + r.finalSize / 100 + "," + r.finalSize / 100 + ")");
                        } else C && c.setAttribute("transform", "translate(" + u.props[12] + "," + u.props[13] + ")"), c.textContent = o[e].val, c.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
                    }
                    C && c && c.setAttribute("d", v);
                }
                for(; e < this.textSpans.length;)this.textSpans[e].span.style.display = "none", e += 1;
                this._sizeChanged = !0;
            }, SVGTextLottieElement.prototype.sourceRectAtTime = function() {
                if (this.prepareFrame(this.comp.renderedFrame - this.data.st), this.renderInnerContent(), this._sizeChanged) {
                    this._sizeChanged = !1;
                    var e = this.layerElement.getBBox();
                    this.bbox = {
                        top: e.y,
                        left: e.x,
                        width: e.width,
                        height: e.height
                    };
                }
                return this.bbox;
            }, SVGTextLottieElement.prototype.getValue = function() {
                var e, t = this.textSpans.length, r;
                for(this.renderedFrame = this.comp.renderedFrame, e = 0; e < t; e += 1)r = this.textSpans[e].glyph, r && (r.prepareFrame(this.comp.renderedFrame - this.data.st), r._mdf && (this._mdf = !0));
            }, SVGTextLottieElement.prototype.renderInnerContent = function() {
                if (this.validateText(), (!this.data.singleShape || this._mdf) && (this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag), this.lettersChangedFlag || this.textAnimator.lettersChangedFlag)) {
                    this._sizeChanged = !0;
                    var e, t, r = this.textAnimator.renderedLetters, i = this.textProperty.currentData.l;
                    t = i.length;
                    var s, a, o;
                    for(e = 0; e < t; e += 1)i[e].n || (s = r[e], a = this.textSpans[e].span, o = this.textSpans[e].glyph, o && o.renderFrame(), s._mdf.m && a.setAttribute("transform", s.m), s._mdf.o && a.setAttribute("opacity", s.o), s._mdf.sw && a.setAttribute("stroke-width", s.sw), s._mdf.sc && a.setAttribute("stroke", s.sc), s._mdf.fc && a.setAttribute("fill", s.fc));
                }
            };
            function ISolidElement(e, t, r) {
                this.initElement(e, t, r);
            }
            extendPrototype([
                IImageElement
            ], ISolidElement), ISolidElement.prototype.createContent = function() {
                var e = createNS("rect");
                e.setAttribute("width", this.data.sw), e.setAttribute("height", this.data.sh), e.setAttribute("fill", this.data.sc), this.layerElement.appendChild(e);
            };
            function NullElement(e, t, r) {
                this.initFrame(), this.initBaseData(e, t, r), this.initFrame(), this.initTransform(e, t, r), this.initHierarchy();
            }
            NullElement.prototype.prepareFrame = function(e) {
                this.prepareProperties(e, !0);
            }, NullElement.prototype.renderFrame = function() {}, NullElement.prototype.getBaseElement = function() {
                return null;
            }, NullElement.prototype.destroy = function() {}, NullElement.prototype.sourceRectAtTime = function() {}, NullElement.prototype.hide = function() {}, extendPrototype([
                BaseElement,
                TransformElement,
                HierarchyElement,
                FrameElement
            ], NullElement);
            function SVGRendererBase() {}
            extendPrototype([
                BaseRenderer
            ], SVGRendererBase), SVGRendererBase.prototype.createNull = function(e) {
                return new NullElement(e, this.globalData, this);
            }, SVGRendererBase.prototype.createShape = function(e) {
                return new SVGShapeElement(e, this.globalData, this);
            }, SVGRendererBase.prototype.createText = function(e) {
                return new SVGTextLottieElement(e, this.globalData, this);
            }, SVGRendererBase.prototype.createImage = function(e) {
                return new IImageElement(e, this.globalData, this);
            }, SVGRendererBase.prototype.createSolid = function(e) {
                return new ISolidElement(e, this.globalData, this);
            }, SVGRendererBase.prototype.configAnimation = function(e) {
                this.svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg"), this.svgElement.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink"), this.renderConfig.viewBoxSize ? this.svgElement.setAttribute("viewBox", this.renderConfig.viewBoxSize) : this.svgElement.setAttribute("viewBox", "0 0 " + e.w + " " + e.h), this.renderConfig.viewBoxOnly || (this.svgElement.setAttribute("width", e.w), this.svgElement.setAttribute("height", e.h), this.svgElement.style.width = "100%", this.svgElement.style.height = "100%", this.svgElement.style.transform = "translate3d(0,0,0)", this.svgElement.style.contentVisibility = this.renderConfig.contentVisibility), this.renderConfig.width && this.svgElement.setAttribute("width", this.renderConfig.width), this.renderConfig.height && this.svgElement.setAttribute("height", this.renderConfig.height), this.renderConfig.className && this.svgElement.setAttribute("class", this.renderConfig.className), this.renderConfig.id && this.svgElement.setAttribute("id", this.renderConfig.id), this.renderConfig.focusable !== void 0 && this.svgElement.setAttribute("focusable", this.renderConfig.focusable), this.svgElement.setAttribute("preserveAspectRatio", this.renderConfig.preserveAspectRatio), this.animationItem.wrapper.appendChild(this.svgElement);
                var t = this.globalData.defs;
                this.setupGlobalData(e, t), this.globalData.progressiveLoad = this.renderConfig.progressiveLoad, this.data = e;
                var r = createNS("clipPath"), i = createNS("rect");
                i.setAttribute("width", e.w), i.setAttribute("height", e.h), i.setAttribute("x", 0), i.setAttribute("y", 0);
                var s = createElementID();
                r.setAttribute("id", s), r.appendChild(i), this.layerElement.setAttribute("clip-path", "url(" + getLocationHref() + "#" + s + ")"), t.appendChild(r), this.layers = e.layers, this.elements = createSizedArray(e.layers.length);
            }, SVGRendererBase.prototype.destroy = function() {
                this.animationItem.wrapper && (this.animationItem.wrapper.innerText = ""), this.layerElement = null, this.globalData.defs = null;
                var e, t = this.layers ? this.layers.length : 0;
                for(e = 0; e < t; e += 1)this.elements[e] && this.elements[e].destroy && this.elements[e].destroy();
                this.elements.length = 0, this.destroyed = !0, this.animationItem = null;
            }, SVGRendererBase.prototype.updateContainerSize = function() {}, SVGRendererBase.prototype.findIndexByInd = function(e) {
                var t = 0, r = this.layers.length;
                for(t = 0; t < r; t += 1)if (this.layers[t].ind === e) return t;
                return -1;
            }, SVGRendererBase.prototype.buildItem = function(e) {
                var t = this.elements;
                if (!(t[e] || this.layers[e].ty === 99)) {
                    t[e] = !0;
                    var r = this.createItem(this.layers[e]);
                    if (t[e] = r, getExpressionsPlugin() && (this.layers[e].ty === 0 && this.globalData.projectInterface.registerComposition(r), r.initExpressions()), this.appendElementInPos(r, e), this.layers[e].tt) {
                        var i = "tp" in this.layers[e] ? this.findIndexByInd(this.layers[e].tp) : e - 1;
                        if (i === -1) return;
                        if (!this.elements[i] || this.elements[i] === !0) this.buildItem(i), this.addPendingElement(r);
                        else {
                            var s = t[i], a = s.getMatte(this.layers[e].tt);
                            r.setMatte(a);
                        }
                    }
                }
            }, SVGRendererBase.prototype.checkPendingElements = function() {
                for(; this.pendingElements.length;){
                    var e = this.pendingElements.pop();
                    if (e.checkParenting(), e.data.tt) for(var t = 0, r = this.elements.length; t < r;){
                        if (this.elements[t] === e) {
                            var i = "tp" in e.data ? this.findIndexByInd(e.data.tp) : t - 1, s = this.elements[i], a = s.getMatte(this.layers[t].tt);
                            e.setMatte(a);
                            break;
                        }
                        t += 1;
                    }
                }
            }, SVGRendererBase.prototype.renderFrame = function(e) {
                if (!(this.renderedFrame === e || this.destroyed)) {
                    e === null ? e = this.renderedFrame : this.renderedFrame = e, this.globalData.frameNum = e, this.globalData.frameId += 1, this.globalData.projectInterface.currentFrame = e, this.globalData._mdf = !1;
                    var t, r = this.layers.length;
                    for(this.completeLayers || this.checkLayers(e), t = r - 1; t >= 0; t -= 1)(this.completeLayers || this.elements[t]) && this.elements[t].prepareFrame(e - this.layers[t].st);
                    if (this.globalData._mdf) for(t = 0; t < r; t += 1)(this.completeLayers || this.elements[t]) && this.elements[t].renderFrame();
                }
            }, SVGRendererBase.prototype.appendElementInPos = function(e, t) {
                var r = e.getBaseElement();
                if (r) {
                    for(var i = 0, s; i < t;)this.elements[i] && this.elements[i] !== !0 && this.elements[i].getBaseElement() && (s = this.elements[i].getBaseElement()), i += 1;
                    s ? this.layerElement.insertBefore(r, s) : this.layerElement.appendChild(r);
                }
            }, SVGRendererBase.prototype.hide = function() {
                this.layerElement.style.display = "none";
            }, SVGRendererBase.prototype.show = function() {
                this.layerElement.style.display = "block";
            };
            function ICompElement() {}
            extendPrototype([
                BaseElement,
                TransformElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement
            ], ICompElement), ICompElement.prototype.initElement = function(e, t, r) {
                this.initFrame(), this.initBaseData(e, t, r), this.initTransform(e, t, r), this.initRenderable(), this.initHierarchy(), this.initRendererElement(), this.createContainerElements(), this.createRenderableComponents(), (this.data.xt || !t.progressiveLoad) && this.buildAllItems(), this.hide();
            }, ICompElement.prototype.prepareFrame = function(e) {
                if (this._mdf = !1, this.prepareRenderableFrame(e), this.prepareProperties(e, this.isInRange), !(!this.isInRange && !this.data.xt)) {
                    if (this.tm._placeholder) this.renderedFrame = e / this.data.sr;
                    else {
                        var t = this.tm.v;
                        t === this.data.op && (t = this.data.op - 1), this.renderedFrame = t;
                    }
                    var r, i = this.elements.length;
                    for(this.completeLayers || this.checkLayers(this.renderedFrame), r = i - 1; r >= 0; r -= 1)(this.completeLayers || this.elements[r]) && (this.elements[r].prepareFrame(this.renderedFrame - this.layers[r].st), this.elements[r]._mdf && (this._mdf = !0));
                }
            }, ICompElement.prototype.renderInnerContent = function() {
                var e, t = this.layers.length;
                for(e = 0; e < t; e += 1)(this.completeLayers || this.elements[e]) && this.elements[e].renderFrame();
            }, ICompElement.prototype.setElements = function(e) {
                this.elements = e;
            }, ICompElement.prototype.getElements = function() {
                return this.elements;
            }, ICompElement.prototype.destroyElements = function() {
                var e, t = this.layers.length;
                for(e = 0; e < t; e += 1)this.elements[e] && this.elements[e].destroy();
            }, ICompElement.prototype.destroy = function() {
                this.destroyElements(), this.destroyBaseElement();
            };
            function SVGCompElement(e, t, r) {
                this.layers = e.layers, this.supports3d = !0, this.completeLayers = !1, this.pendingElements = [], this.elements = this.layers ? createSizedArray(this.layers.length) : [], this.initElement(e, t, r), this.tm = e.tm ? PropertyFactory.getProp(this, e.tm, 0, t.frameRate, this) : {
                    _placeholder: !0
                };
            }
            extendPrototype([
                SVGRendererBase,
                ICompElement,
                SVGBaseElement
            ], SVGCompElement), SVGCompElement.prototype.createComp = function(e) {
                return new SVGCompElement(e, this.globalData, this);
            };
            function SVGRenderer(e, t) {
                this.animationItem = e, this.layers = null, this.renderedFrame = -1, this.svgElement = createNS("svg");
                var r = "";
                if (t && t.title) {
                    var i = createNS("title"), s = createElementID();
                    i.setAttribute("id", s), i.textContent = t.title, this.svgElement.appendChild(i), r += s;
                }
                if (t && t.description) {
                    var a = createNS("desc"), o = createElementID();
                    a.setAttribute("id", o), a.textContent = t.description, this.svgElement.appendChild(a), r += " " + o;
                }
                r && this.svgElement.setAttribute("aria-labelledby", r);
                var h = createNS("defs");
                this.svgElement.appendChild(h);
                var c = createNS("g");
                this.svgElement.appendChild(c), this.layerElement = c, this.renderConfig = {
                    preserveAspectRatio: t && t.preserveAspectRatio || "xMidYMid meet",
                    imagePreserveAspectRatio: t && t.imagePreserveAspectRatio || "xMidYMid slice",
                    contentVisibility: t && t.contentVisibility || "visible",
                    progressiveLoad: t && t.progressiveLoad || !1,
                    hideOnTransparent: !(t && t.hideOnTransparent === !1),
                    viewBoxOnly: t && t.viewBoxOnly || !1,
                    viewBoxSize: t && t.viewBoxSize || !1,
                    className: t && t.className || "",
                    id: t && t.id || "",
                    focusable: t && t.focusable,
                    filterSize: {
                        width: t && t.filterSize && t.filterSize.width || "100%",
                        height: t && t.filterSize && t.filterSize.height || "100%",
                        x: t && t.filterSize && t.filterSize.x || "0%",
                        y: t && t.filterSize && t.filterSize.y || "0%"
                    },
                    width: t && t.width,
                    height: t && t.height,
                    runExpressions: !t || t.runExpressions === void 0 || t.runExpressions
                }, this.globalData = {
                    _mdf: !1,
                    frameNum: -1,
                    defs: h,
                    renderConfig: this.renderConfig
                }, this.elements = [], this.pendingElements = [], this.destroyed = !1, this.rendererType = "svg";
            }
            extendPrototype([
                SVGRendererBase
            ], SVGRenderer), SVGRenderer.prototype.createComp = function(e) {
                return new SVGCompElement(e, this.globalData, this);
            };
            function ShapeTransformManager() {
                this.sequences = {}, this.sequenceList = [], this.transform_key_count = 0;
            }
            ShapeTransformManager.prototype = {
                addTransformSequence: function(t) {
                    var r, i = t.length, s = "_";
                    for(r = 0; r < i; r += 1)s += t[r].transform.key + "_";
                    var a = this.sequences[s];
                    return a || (a = {
                        transforms: [].concat(t),
                        finalTransform: new Matrix,
                        _mdf: !1
                    }, this.sequences[s] = a, this.sequenceList.push(a)), a;
                },
                processSequence: function(t, r) {
                    for(var i = 0, s = t.transforms.length, a = r; i < s && !r;){
                        if (t.transforms[i].transform.mProps._mdf) {
                            a = !0;
                            break;
                        }
                        i += 1;
                    }
                    if (a) for(t.finalTransform.reset(), i = s - 1; i >= 0; i -= 1)t.finalTransform.multiply(t.transforms[i].transform.mProps.v);
                    t._mdf = a;
                },
                processSequences: function(t) {
                    var r, i = this.sequenceList.length;
                    for(r = 0; r < i; r += 1)this.processSequence(this.sequenceList[r], t);
                },
                getNewKey: function() {
                    return this.transform_key_count += 1, "_" + this.transform_key_count;
                }
            };
            var lumaLoader = function() {
                var t = "__lottie_element_luma_buffer", r = null, i = null, s = null;
                function a() {
                    var c = createNS("svg"), u = createNS("filter"), v = createNS("feColorMatrix");
                    return u.setAttribute("id", t), v.setAttribute("type", "matrix"), v.setAttribute("color-interpolation-filters", "sRGB"), v.setAttribute("values", "0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0"), u.appendChild(v), c.appendChild(u), c.setAttribute("id", t + "_svg"), featureSupport.svgLumaHidden && (c.style.display = "none"), c;
                }
                function o() {
                    r || (s = a(), document.body.appendChild(s), r = createTag("canvas"), i = r.getContext("2d"), i.filter = "url(#" + t + ")", i.fillStyle = "rgba(0,0,0,0)", i.fillRect(0, 0, 1, 1));
                }
                function h(c) {
                    return r || o(), r.width = c.width, r.height = c.height, i.filter = "url(#" + t + ")", r;
                }
                return {
                    load: o,
                    get: h
                };
            };
            function createCanvas(e, t) {
                if (featureSupport.offscreenCanvas) return new OffscreenCanvas(e, t);
                var r = createTag("canvas");
                return r.width = e, r.height = t, r;
            }
            var assetLoader = function() {
                return {
                    loadLumaCanvas: lumaLoader.load,
                    getLumaCanvas: lumaLoader.get,
                    createCanvas
                };
            }(), registeredEffects = {};
            function CVEffects(e) {
                var t, r = e.data.ef ? e.data.ef.length : 0;
                this.filters = [];
                var i;
                for(t = 0; t < r; t += 1){
                    i = null;
                    var s = e.data.ef[t].ty;
                    if (registeredEffects[s]) {
                        var a = registeredEffects[s].effect;
                        i = new a(e.effectsManager.effectElements[t], e);
                    }
                    i && this.filters.push(i);
                }
                this.filters.length && e.addRenderableComponent(this);
            }
            CVEffects.prototype.renderFrame = function(e) {
                var t, r = this.filters.length;
                for(t = 0; t < r; t += 1)this.filters[t].renderFrame(e);
            }, CVEffects.prototype.getEffects = function(e) {
                var t, r = this.filters.length, i = [];
                for(t = 0; t < r; t += 1)this.filters[t].type === e && i.push(this.filters[t]);
                return i;
            };
            function registerEffect(e, t) {
                registeredEffects[e] = {
                    effect: t
                };
            }
            function CVMaskElement(e, t) {
                this.data = e, this.element = t, this.masksProperties = this.data.masksProperties || [], this.viewData = createSizedArray(this.masksProperties.length);
                var r, i = this.masksProperties.length, s = !1;
                for(r = 0; r < i; r += 1)this.masksProperties[r].mode !== "n" && (s = !0), this.viewData[r] = ShapePropertyFactory.getShapeProp(this.element, this.masksProperties[r], 3);
                this.hasMasks = s, s && this.element.addRenderableComponent(this);
            }
            CVMaskElement.prototype.renderFrame = function() {
                if (this.hasMasks) {
                    var e = this.element.finalTransform.mat, t = this.element.canvasContext, r, i = this.masksProperties.length, s, a, o;
                    for(t.beginPath(), r = 0; r < i; r += 1)if (this.masksProperties[r].mode !== "n") {
                        this.masksProperties[r].inv && (t.moveTo(0, 0), t.lineTo(this.element.globalData.compSize.w, 0), t.lineTo(this.element.globalData.compSize.w, this.element.globalData.compSize.h), t.lineTo(0, this.element.globalData.compSize.h), t.lineTo(0, 0)), o = this.viewData[r].v, s = e.applyToPointArray(o.v[0][0], o.v[0][1], 0), t.moveTo(s[0], s[1]);
                        var h, c = o._length;
                        for(h = 1; h < c; h += 1)a = e.applyToTriplePoints(o.o[h - 1], o.i[h], o.v[h]), t.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
                        a = e.applyToTriplePoints(o.o[h - 1], o.i[0], o.v[0]), t.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
                    }
                    this.element.globalData.renderer.save(!0), t.clip();
                }
            }, CVMaskElement.prototype.getMaskProperty = MaskElement.prototype.getMaskProperty, CVMaskElement.prototype.destroy = function() {
                this.element = null;
            };
            function CVBaseElement() {}
            var operationsMap = {
                1: "source-in",
                2: "source-out",
                3: "source-in",
                4: "source-out"
            };
            CVBaseElement.prototype = {
                createElements: function() {},
                initRendererElement: function() {},
                createContainerElements: function() {
                    if (this.data.tt >= 1) {
                        this.buffers = [];
                        var t = this.globalData.canvasContext, r = assetLoader.createCanvas(t.canvas.width, t.canvas.height);
                        this.buffers.push(r);
                        var i = assetLoader.createCanvas(t.canvas.width, t.canvas.height);
                        this.buffers.push(i), this.data.tt >= 3 && !document._isProxy && assetLoader.loadLumaCanvas();
                    }
                    this.canvasContext = this.globalData.canvasContext, this.transformCanvas = this.globalData.transformCanvas, this.renderableEffectsManager = new CVEffects(this), this.searchEffectTransforms();
                },
                createContent: function() {},
                setBlendMode: function() {
                    var t = this.globalData;
                    if (t.blendMode !== this.data.bm) {
                        t.blendMode = this.data.bm;
                        var r = getBlendMode(this.data.bm);
                        t.canvasContext.globalCompositeOperation = r;
                    }
                },
                createRenderableComponents: function() {
                    this.maskManager = new CVMaskElement(this.data, this), this.transformEffects = this.renderableEffectsManager.getEffects(effectTypes.TRANSFORM_EFFECT);
                },
                hideElement: function() {
                    !this.hidden && (!this.isInRange || this.isTransparent) && (this.hidden = !0);
                },
                showElement: function() {
                    this.isInRange && !this.isTransparent && (this.hidden = !1, this._isFirstFrame = !0, this.maskManager._isFirstFrame = !0);
                },
                clearCanvas: function(t) {
                    t.clearRect(this.transformCanvas.tx, this.transformCanvas.ty, this.transformCanvas.w * this.transformCanvas.sx, this.transformCanvas.h * this.transformCanvas.sy);
                },
                prepareLayer: function() {
                    if (this.data.tt >= 1) {
                        var t = this.buffers[0], r = t.getContext("2d");
                        this.clearCanvas(r), r.drawImage(this.canvasContext.canvas, 0, 0), this.currentTransform = this.canvasContext.getTransform(), this.canvasContext.setTransform(1, 0, 0, 1, 0, 0), this.clearCanvas(this.canvasContext), this.canvasContext.setTransform(this.currentTransform);
                    }
                },
                exitLayer: function() {
                    if (this.data.tt >= 1) {
                        var t = this.buffers[1], r = t.getContext("2d");
                        this.clearCanvas(r), r.drawImage(this.canvasContext.canvas, 0, 0), this.canvasContext.setTransform(1, 0, 0, 1, 0, 0), this.clearCanvas(this.canvasContext), this.canvasContext.setTransform(this.currentTransform);
                        var i = this.comp.getElementById("tp" in this.data ? this.data.tp : this.data.ind - 1);
                        if (i.renderFrame(!0), this.canvasContext.setTransform(1, 0, 0, 1, 0, 0), this.data.tt >= 3 && !document._isProxy) {
                            var s = assetLoader.getLumaCanvas(this.canvasContext.canvas), a = s.getContext("2d");
                            a.drawImage(this.canvasContext.canvas, 0, 0), this.clearCanvas(this.canvasContext), this.canvasContext.drawImage(s, 0, 0);
                        }
                        this.canvasContext.globalCompositeOperation = operationsMap[this.data.tt], this.canvasContext.drawImage(t, 0, 0), this.canvasContext.globalCompositeOperation = "destination-over", this.canvasContext.drawImage(this.buffers[0], 0, 0), this.canvasContext.setTransform(this.currentTransform), this.canvasContext.globalCompositeOperation = "source-over";
                    }
                },
                renderFrame: function(t) {
                    if (!(this.hidden || this.data.hd) && !(this.data.td === 1 && !t)) {
                        this.renderTransform(), this.renderRenderable(), this.renderLocalTransform(), this.setBlendMode();
                        var r = this.data.ty === 0;
                        this.prepareLayer(), this.globalData.renderer.save(r), this.globalData.renderer.ctxTransform(this.finalTransform.localMat.props), this.globalData.renderer.ctxOpacity(this.finalTransform.localOpacity), this.renderInnerContent(), this.globalData.renderer.restore(r), this.exitLayer(), this.maskManager.hasMasks && this.globalData.renderer.restore(!0), this._isFirstFrame && (this._isFirstFrame = !1);
                    }
                },
                destroy: function() {
                    this.canvasContext = null, this.data = null, this.globalData = null, this.maskManager.destroy();
                },
                mHelper: new Matrix
            }, CVBaseElement.prototype.hide = CVBaseElement.prototype.hideElement, CVBaseElement.prototype.show = CVBaseElement.prototype.showElement;
            function CVShapeData(e, t, r, i) {
                this.styledShapes = [], this.tr = [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ];
                var s = 4;
                t.ty === "rc" ? s = 5 : t.ty === "el" ? s = 6 : t.ty === "sr" && (s = 7), this.sh = ShapePropertyFactory.getShapeProp(e, t, s, e);
                var a, o = r.length, h;
                for(a = 0; a < o; a += 1)r[a].closed || (h = {
                    transforms: i.addTransformSequence(r[a].transforms),
                    trNodes: []
                }, this.styledShapes.push(h), r[a].elements.push(h));
            }
            CVShapeData.prototype.setAsAnimated = SVGShapeData.prototype.setAsAnimated;
            function CVShapeElement(e, t, r) {
                this.shapes = [], this.shapesData = e.shapes, this.stylesList = [], this.itemsData = [], this.prevViewData = [], this.shapeModifiers = [], this.processedElements = [], this.transformsManager = new ShapeTransformManager, this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                CVBaseElement,
                IShapeElement,
                HierarchyElement,
                FrameElement,
                RenderableElement
            ], CVShapeElement), CVShapeElement.prototype.initElement = RenderableDOMElement.prototype.initElement, CVShapeElement.prototype.transformHelper = {
                opacity: 1,
                _opMdf: !1
            }, CVShapeElement.prototype.dashResetter = [], CVShapeElement.prototype.createContent = function() {
                this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, !0, []);
            }, CVShapeElement.prototype.createStyleElement = function(e, t) {
                var r = {
                    data: e,
                    type: e.ty,
                    preTransforms: this.transformsManager.addTransformSequence(t),
                    transforms: [],
                    elements: [],
                    closed: e.hd === !0
                }, i = {};
                if (e.ty === "fl" || e.ty === "st" ? (i.c = PropertyFactory.getProp(this, e.c, 1, 255, this), i.c.k || (r.co = "rgb(" + bmFloor(i.c.v[0]) + "," + bmFloor(i.c.v[1]) + "," + bmFloor(i.c.v[2]) + ")")) : (e.ty === "gf" || e.ty === "gs") && (i.s = PropertyFactory.getProp(this, e.s, 1, null, this), i.e = PropertyFactory.getProp(this, e.e, 1, null, this), i.h = PropertyFactory.getProp(this, e.h || {
                    k: 0
                }, 0, .01, this), i.a = PropertyFactory.getProp(this, e.a || {
                    k: 0
                }, 0, degToRads, this), i.g = new GradientProperty(this, e.g, this)), i.o = PropertyFactory.getProp(this, e.o, 0, .01, this), e.ty === "st" || e.ty === "gs") {
                    if (r.lc = lineCapEnum[e.lc || 2], r.lj = lineJoinEnum[e.lj || 2], e.lj == 1 && (r.ml = e.ml), i.w = PropertyFactory.getProp(this, e.w, 0, null, this), i.w.k || (r.wi = i.w.v), e.d) {
                        var s = new DashProperty(this, e.d, "canvas", this);
                        i.d = s, i.d.k || (r.da = i.d.dashArray, r.do = i.d.dashoffset[0]);
                    }
                } else r.r = e.r === 2 ? "evenodd" : "nonzero";
                return this.stylesList.push(r), i.style = r, i;
            }, CVShapeElement.prototype.createGroupElement = function() {
                var e = {
                    it: [],
                    prevViewData: []
                };
                return e;
            }, CVShapeElement.prototype.createTransformElement = function(e) {
                var t = {
                    transform: {
                        opacity: 1,
                        _opMdf: !1,
                        key: this.transformsManager.getNewKey(),
                        op: PropertyFactory.getProp(this, e.o, 0, .01, this),
                        mProps: TransformPropertyFactory.getTransformProperty(this, e, this)
                    }
                };
                return t;
            }, CVShapeElement.prototype.createShapeElement = function(e) {
                var t = new CVShapeData(this, e, this.stylesList, this.transformsManager);
                return this.shapes.push(t), this.addShapeToModifiers(t), t;
            }, CVShapeElement.prototype.reloadShapes = function() {
                this._isFirstFrame = !0;
                var e, t = this.itemsData.length;
                for(e = 0; e < t; e += 1)this.prevViewData[e] = this.itemsData[e];
                for(this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, !0, []), t = this.dynamicProperties.length, e = 0; e < t; e += 1)this.dynamicProperties[e].getValue();
                this.renderModifiers(), this.transformsManager.processSequences(this._isFirstFrame);
            }, CVShapeElement.prototype.addTransformToStyleList = function(e) {
                var t, r = this.stylesList.length;
                for(t = 0; t < r; t += 1)this.stylesList[t].closed || this.stylesList[t].transforms.push(e);
            }, CVShapeElement.prototype.removeTransformFromStyleList = function() {
                var e, t = this.stylesList.length;
                for(e = 0; e < t; e += 1)this.stylesList[e].closed || this.stylesList[e].transforms.pop();
            }, CVShapeElement.prototype.closeStyles = function(e) {
                var t, r = e.length;
                for(t = 0; t < r; t += 1)e[t].closed = !0;
            }, CVShapeElement.prototype.searchShapes = function(e, t, r, i, s) {
                var a, o = e.length - 1, h, c, u = [], v = [], C, d, S, _ = [].concat(s);
                for(a = o; a >= 0; a -= 1){
                    if (C = this.searchProcessedElement(e[a]), C ? t[a] = r[C - 1] : e[a]._shouldRender = i, e[a].ty === "fl" || e[a].ty === "st" || e[a].ty === "gf" || e[a].ty === "gs") C ? t[a].style.closed = !1 : t[a] = this.createStyleElement(e[a], _), u.push(t[a].style);
                    else if (e[a].ty === "gr") {
                        if (!C) t[a] = this.createGroupElement(e[a]);
                        else for(c = t[a].it.length, h = 0; h < c; h += 1)t[a].prevViewData[h] = t[a].it[h];
                        this.searchShapes(e[a].it, t[a].it, t[a].prevViewData, i, _);
                    } else e[a].ty === "tr" ? (C || (S = this.createTransformElement(e[a]), t[a] = S), _.push(t[a]), this.addTransformToStyleList(t[a])) : e[a].ty === "sh" || e[a].ty === "rc" || e[a].ty === "el" || e[a].ty === "sr" ? C || (t[a] = this.createShapeElement(e[a])) : e[a].ty === "tm" || e[a].ty === "rd" || e[a].ty === "pb" || e[a].ty === "zz" || e[a].ty === "op" ? (C ? (d = t[a], d.closed = !1) : (d = ShapeModifiers.getModifier(e[a].ty), d.init(this, e[a]), t[a] = d, this.shapeModifiers.push(d)), v.push(d)) : e[a].ty === "rp" && (C ? (d = t[a], d.closed = !0) : (d = ShapeModifiers.getModifier(e[a].ty), t[a] = d, d.init(this, e, a, t), this.shapeModifiers.push(d), i = !1), v.push(d));
                    this.addProcessedElement(e[a], a + 1);
                }
                for(this.removeTransformFromStyleList(), this.closeStyles(u), o = v.length, a = 0; a < o; a += 1)v[a].closed = !0;
            }, CVShapeElement.prototype.renderInnerContent = function() {
                this.transformHelper.opacity = 1, this.transformHelper._opMdf = !1, this.renderModifiers(), this.transformsManager.processSequences(this._isFirstFrame), this.renderShape(this.transformHelper, this.shapesData, this.itemsData, !0);
            }, CVShapeElement.prototype.renderShapeTransform = function(e, t) {
                (e._opMdf || t.op._mdf || this._isFirstFrame) && (t.opacity = e.opacity, t.opacity *= t.op.v, t._opMdf = !0);
            }, CVShapeElement.prototype.drawLayer = function() {
                var e, t = this.stylesList.length, r, i, s, a, o, h, c = this.globalData.renderer, u = this.globalData.canvasContext, v, C;
                for(e = 0; e < t; e += 1)if (C = this.stylesList[e], v = C.type, !((v === "st" || v === "gs") && C.wi === 0 || !C.data._shouldRender || C.coOp === 0 || this.globalData.currentGlobalAlpha === 0)) {
                    for(c.save(), o = C.elements, v === "st" || v === "gs" ? (c.ctxStrokeStyle(v === "st" ? C.co : C.grd), c.ctxLineWidth(C.wi), c.ctxLineCap(C.lc), c.ctxLineJoin(C.lj), c.ctxMiterLimit(C.ml || 0)) : c.ctxFillStyle(v === "fl" ? C.co : C.grd), c.ctxOpacity(C.coOp), v !== "st" && v !== "gs" && u.beginPath(), c.ctxTransform(C.preTransforms.finalTransform.props), i = o.length, r = 0; r < i; r += 1){
                        for((v === "st" || v === "gs") && (u.beginPath(), C.da && (u.setLineDash(C.da), u.lineDashOffset = C.do)), h = o[r].trNodes, a = h.length, s = 0; s < a; s += 1)h[s].t === "m" ? u.moveTo(h[s].p[0], h[s].p[1]) : h[s].t === "c" ? u.bezierCurveTo(h[s].pts[0], h[s].pts[1], h[s].pts[2], h[s].pts[3], h[s].pts[4], h[s].pts[5]) : u.closePath();
                        (v === "st" || v === "gs") && (c.ctxStroke(), C.da && u.setLineDash(this.dashResetter));
                    }
                    v !== "st" && v !== "gs" && this.globalData.renderer.ctxFill(C.r), c.restore();
                }
            }, CVShapeElement.prototype.renderShape = function(e, t, r, i) {
                var s, a = t.length - 1, o;
                for(o = e, s = a; s >= 0; s -= 1)t[s].ty === "tr" ? (o = r[s].transform, this.renderShapeTransform(e, o)) : t[s].ty === "sh" || t[s].ty === "el" || t[s].ty === "rc" || t[s].ty === "sr" ? this.renderPath(t[s], r[s]) : t[s].ty === "fl" ? this.renderFill(t[s], r[s], o) : t[s].ty === "st" ? this.renderStroke(t[s], r[s], o) : t[s].ty === "gf" || t[s].ty === "gs" ? this.renderGradientFill(t[s], r[s], o) : t[s].ty === "gr" ? this.renderShape(o, t[s].it, r[s].it) : t[s].ty;
                i && this.drawLayer();
            }, CVShapeElement.prototype.renderStyledShape = function(e, t) {
                if (this._isFirstFrame || t._mdf || e.transforms._mdf) {
                    var r = e.trNodes, i = t.paths, s, a, o, h = i._length;
                    r.length = 0;
                    var c = e.transforms.finalTransform;
                    for(o = 0; o < h; o += 1){
                        var u = i.shapes[o];
                        if (u && u.v) {
                            for(a = u._length, s = 1; s < a; s += 1)s === 1 && r.push({
                                t: "m",
                                p: c.applyToPointArray(u.v[0][0], u.v[0][1], 0)
                            }), r.push({
                                t: "c",
                                pts: c.applyToTriplePoints(u.o[s - 1], u.i[s], u.v[s])
                            });
                            a === 1 && r.push({
                                t: "m",
                                p: c.applyToPointArray(u.v[0][0], u.v[0][1], 0)
                            }), u.c && a && (r.push({
                                t: "c",
                                pts: c.applyToTriplePoints(u.o[s - 1], u.i[0], u.v[0])
                            }), r.push({
                                t: "z"
                            }));
                        }
                    }
                    e.trNodes = r;
                }
            }, CVShapeElement.prototype.renderPath = function(e, t) {
                if (e.hd !== !0 && e._shouldRender) {
                    var r, i = t.styledShapes.length;
                    for(r = 0; r < i; r += 1)this.renderStyledShape(t.styledShapes[r], t.sh);
                }
            }, CVShapeElement.prototype.renderFill = function(e, t, r) {
                var i = t.style;
                (t.c._mdf || this._isFirstFrame) && (i.co = "rgb(" + bmFloor(t.c.v[0]) + "," + bmFloor(t.c.v[1]) + "," + bmFloor(t.c.v[2]) + ")"), (t.o._mdf || r._opMdf || this._isFirstFrame) && (i.coOp = t.o.v * r.opacity);
            }, CVShapeElement.prototype.renderGradientFill = function(e, t, r) {
                var i = t.style, s;
                if (!i.grd || t.g._mdf || t.s._mdf || t.e._mdf || e.t !== 1 && (t.h._mdf || t.a._mdf)) {
                    var a = this.globalData.canvasContext, o = t.s.v, h = t.e.v;
                    if (e.t === 1) s = a.createLinearGradient(o[0], o[1], h[0], h[1]);
                    else {
                        var c = Math.sqrt(Math.pow(o[0] - h[0], 2) + Math.pow(o[1] - h[1], 2)), u = Math.atan2(h[1] - o[1], h[0] - o[0]), v = t.h.v;
                        v >= 1 ? v = .99 : v <= -1 && (v = -.99);
                        var C = c * v, d = Math.cos(u + t.a.v) * C + o[0], S = Math.sin(u + t.a.v) * C + o[1];
                        s = a.createRadialGradient(d, S, 0, o[0], o[1], c);
                    }
                    var _, g = e.g.p, T = t.g.c, x = 1;
                    for(_ = 0; _ < g; _ += 1)t.g._hasOpacity && t.g._collapsable && (x = t.g.o[_ * 2 + 1]), s.addColorStop(T[_ * 4] / 100, "rgba(" + T[_ * 4 + 1] + "," + T[_ * 4 + 2] + "," + T[_ * 4 + 3] + "," + x + ")");
                    i.grd = s;
                }
                i.coOp = t.o.v * r.opacity;
            }, CVShapeElement.prototype.renderStroke = function(e, t, r) {
                var i = t.style, s = t.d;
                s && (s._mdf || this._isFirstFrame) && (i.da = s.dashArray, i.do = s.dashoffset[0]), (t.c._mdf || this._isFirstFrame) && (i.co = "rgb(" + bmFloor(t.c.v[0]) + "," + bmFloor(t.c.v[1]) + "," + bmFloor(t.c.v[2]) + ")"), (t.o._mdf || r._opMdf || this._isFirstFrame) && (i.coOp = t.o.v * r.opacity), (t.w._mdf || this._isFirstFrame) && (i.wi = t.w.v);
            }, CVShapeElement.prototype.destroy = function() {
                this.shapesData = null, this.globalData = null, this.canvasContext = null, this.stylesList.length = 0, this.itemsData.length = 0;
            };
            function CVTextElement(e, t, r) {
                this.textSpans = [], this.yOffset = 0, this.fillColorAnim = !1, this.strokeColorAnim = !1, this.strokeWidthAnim = !1, this.stroke = !1, this.fill = !1, this.justifyOffset = 0, this.currentRender = null, this.renderType = "canvas", this.values = {
                    fill: "rgba(0,0,0,0)",
                    stroke: "rgba(0,0,0,0)",
                    sWidth: 0,
                    fValue: ""
                }, this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                CVBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableElement,
                ITextElement
            ], CVTextElement), CVTextElement.prototype.tHelper = createTag("canvas").getContext("2d"), CVTextElement.prototype.buildNewText = function() {
                var e = this.textProperty.currentData;
                this.renderedLetters = createSizedArray(e.l ? e.l.length : 0);
                var t = !1;
                e.fc ? (t = !0, this.values.fill = this.buildColor(e.fc)) : this.values.fill = "rgba(0,0,0,0)", this.fill = t;
                var r = !1;
                e.sc && (r = !0, this.values.stroke = this.buildColor(e.sc), this.values.sWidth = e.sw);
                var i = this.globalData.fontManager.getFontByName(e.f), s, a, o = e.l, h = this.mHelper;
                this.stroke = r, this.values.fValue = e.finalSize + "px " + this.globalData.fontManager.getFontByName(e.f).fFamily, a = e.finalText.length;
                var c, u, v, C, d, S, _, g, T, x, E = this.data.singleShape, y = e.tr * .001 * e.finalSize, b = 0, w = 0, j = !0, M = 0;
                for(s = 0; s < a; s += 1){
                    c = this.globalData.fontManager.getCharData(e.finalText[s], i.fStyle, this.globalData.fontManager.getFontByName(e.f).fFamily), u = c && c.data || {}, h.reset(), E && o[s].n && (b = -y, w += e.yOffset, w += j ? 1 : 0, j = !1), d = u.shapes ? u.shapes[0].it : [], _ = d.length, h.scale(e.finalSize / 100, e.finalSize / 100), E && this.applyTextPropertiesToMatrix(e, h, o[s].line, b, w), T = createSizedArray(_ - 1);
                    var I = 0;
                    for(S = 0; S < _; S += 1)if (d[S].ty === "sh") {
                        for(C = d[S].ks.k.i.length, g = d[S].ks.k, x = [], v = 1; v < C; v += 1)v === 1 && x.push(h.applyToX(g.v[0][0], g.v[0][1], 0), h.applyToY(g.v[0][0], g.v[0][1], 0)), x.push(h.applyToX(g.o[v - 1][0], g.o[v - 1][1], 0), h.applyToY(g.o[v - 1][0], g.o[v - 1][1], 0), h.applyToX(g.i[v][0], g.i[v][1], 0), h.applyToY(g.i[v][0], g.i[v][1], 0), h.applyToX(g.v[v][0], g.v[v][1], 0), h.applyToY(g.v[v][0], g.v[v][1], 0));
                        x.push(h.applyToX(g.o[v - 1][0], g.o[v - 1][1], 0), h.applyToY(g.o[v - 1][0], g.o[v - 1][1], 0), h.applyToX(g.i[0][0], g.i[0][1], 0), h.applyToY(g.i[0][0], g.i[0][1], 0), h.applyToX(g.v[0][0], g.v[0][1], 0), h.applyToY(g.v[0][0], g.v[0][1], 0)), T[I] = x, I += 1;
                    }
                    E && (b += o[s].l, b += y), this.textSpans[M] ? this.textSpans[M].elem = T : this.textSpans[M] = {
                        elem: T
                    }, M += 1;
                }
            }, CVTextElement.prototype.renderInnerContent = function() {
                this.validateText();
                var e = this.canvasContext;
                e.font = this.values.fValue, this.globalData.renderer.ctxLineCap("butt"), this.globalData.renderer.ctxLineJoin("miter"), this.globalData.renderer.ctxMiterLimit(4), this.data.singleShape || this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag);
                var t, r, i, s, a, o, h = this.textAnimator.renderedLetters, c = this.textProperty.currentData.l;
                r = c.length;
                var u, v = null, C = null, d = null, S, _, g = this.globalData.renderer;
                for(t = 0; t < r; t += 1)if (!c[t].n) {
                    if (u = h[t], u && (g.save(), g.ctxTransform(u.p), g.ctxOpacity(u.o)), this.fill) {
                        for(u && u.fc ? v !== u.fc && (g.ctxFillStyle(u.fc), v = u.fc) : v !== this.values.fill && (v = this.values.fill, g.ctxFillStyle(this.values.fill)), S = this.textSpans[t].elem, s = S.length, this.globalData.canvasContext.beginPath(), i = 0; i < s; i += 1)for(_ = S[i], o = _.length, this.globalData.canvasContext.moveTo(_[0], _[1]), a = 2; a < o; a += 6)this.globalData.canvasContext.bezierCurveTo(_[a], _[a + 1], _[a + 2], _[a + 3], _[a + 4], _[a + 5]);
                        this.globalData.canvasContext.closePath(), g.ctxFill();
                    }
                    if (this.stroke) {
                        for(u && u.sw ? d !== u.sw && (d = u.sw, g.ctxLineWidth(u.sw)) : d !== this.values.sWidth && (d = this.values.sWidth, g.ctxLineWidth(this.values.sWidth)), u && u.sc ? C !== u.sc && (C = u.sc, g.ctxStrokeStyle(u.sc)) : C !== this.values.stroke && (C = this.values.stroke, g.ctxStrokeStyle(this.values.stroke)), S = this.textSpans[t].elem, s = S.length, this.globalData.canvasContext.beginPath(), i = 0; i < s; i += 1)for(_ = S[i], o = _.length, this.globalData.canvasContext.moveTo(_[0], _[1]), a = 2; a < o; a += 6)this.globalData.canvasContext.bezierCurveTo(_[a], _[a + 1], _[a + 2], _[a + 3], _[a + 4], _[a + 5]);
                        this.globalData.canvasContext.closePath(), g.ctxStroke();
                    }
                    u && this.globalData.renderer.restore();
                }
            };
            function CVImageElement(e, t, r) {
                this.assetData = t.getAssetData(e.refId), this.img = t.imageLoader.getAsset(this.assetData), this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                CVBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableElement
            ], CVImageElement), CVImageElement.prototype.initElement = SVGShapeElement.prototype.initElement, CVImageElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame, CVImageElement.prototype.createContent = function() {
                if (this.img.width && (this.assetData.w !== this.img.width || this.assetData.h !== this.img.height)) {
                    var e = createTag("canvas");
                    e.width = this.assetData.w, e.height = this.assetData.h;
                    var t = e.getContext("2d"), r = this.img.width, i = this.img.height, s = r / i, a = this.assetData.w / this.assetData.h, o, h, c = this.assetData.pr || this.globalData.renderConfig.imagePreserveAspectRatio;
                    s > a && c === "xMidYMid slice" || s < a && c !== "xMidYMid slice" ? (h = i, o = h * a) : (o = r, h = o / a), t.drawImage(this.img, (r - o) / 2, (i - h) / 2, o, h, 0, 0, this.assetData.w, this.assetData.h), this.img = e;
                }
            }, CVImageElement.prototype.renderInnerContent = function() {
                this.canvasContext.drawImage(this.img, 0, 0);
            }, CVImageElement.prototype.destroy = function() {
                this.img = null;
            };
            function CVSolidElement(e, t, r) {
                this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                CVBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableElement
            ], CVSolidElement), CVSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement, CVSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame, CVSolidElement.prototype.renderInnerContent = function() {
                this.globalData.renderer.ctxFillStyle(this.data.sc), this.globalData.renderer.ctxFillRect(0, 0, this.data.sw, this.data.sh);
            };
            function CanvasRendererBase() {}
            extendPrototype([
                BaseRenderer
            ], CanvasRendererBase), CanvasRendererBase.prototype.createShape = function(e) {
                return new CVShapeElement(e, this.globalData, this);
            }, CanvasRendererBase.prototype.createText = function(e) {
                return new CVTextElement(e, this.globalData, this);
            }, CanvasRendererBase.prototype.createImage = function(e) {
                return new CVImageElement(e, this.globalData, this);
            }, CanvasRendererBase.prototype.createSolid = function(e) {
                return new CVSolidElement(e, this.globalData, this);
            }, CanvasRendererBase.prototype.createNull = SVGRenderer.prototype.createNull, CanvasRendererBase.prototype.ctxTransform = function(e) {
                e[0] === 1 && e[1] === 0 && e[4] === 0 && e[5] === 1 && e[12] === 0 && e[13] === 0 || this.canvasContext.transform(e[0], e[1], e[4], e[5], e[12], e[13]);
            }, CanvasRendererBase.prototype.ctxOpacity = function(e) {
                this.canvasContext.globalAlpha *= e < 0 ? 0 : e;
            }, CanvasRendererBase.prototype.ctxFillStyle = function(e) {
                this.canvasContext.fillStyle = e;
            }, CanvasRendererBase.prototype.ctxStrokeStyle = function(e) {
                this.canvasContext.strokeStyle = e;
            }, CanvasRendererBase.prototype.ctxLineWidth = function(e) {
                this.canvasContext.lineWidth = e;
            }, CanvasRendererBase.prototype.ctxLineCap = function(e) {
                this.canvasContext.lineCap = e;
            }, CanvasRendererBase.prototype.ctxLineJoin = function(e) {
                this.canvasContext.lineJoin = e;
            }, CanvasRendererBase.prototype.ctxMiterLimit = function(e) {
                this.canvasContext.miterLimit = e;
            }, CanvasRendererBase.prototype.ctxFill = function(e) {
                this.canvasContext.fill(e);
            }, CanvasRendererBase.prototype.ctxFillRect = function(e, t, r, i) {
                this.canvasContext.fillRect(e, t, r, i);
            }, CanvasRendererBase.prototype.ctxStroke = function() {
                this.canvasContext.stroke();
            }, CanvasRendererBase.prototype.reset = function() {
                if (!this.renderConfig.clearCanvas) {
                    this.canvasContext.restore();
                    return;
                }
                this.contextData.reset();
            }, CanvasRendererBase.prototype.save = function() {
                this.canvasContext.save();
            }, CanvasRendererBase.prototype.restore = function(e) {
                if (!this.renderConfig.clearCanvas) {
                    this.canvasContext.restore();
                    return;
                }
                e && (this.globalData.blendMode = "source-over"), this.contextData.restore(e);
            }, CanvasRendererBase.prototype.configAnimation = function(e) {
                if (this.animationItem.wrapper) {
                    this.animationItem.container = createTag("canvas");
                    var t = this.animationItem.container.style;
                    t.width = "100%", t.height = "100%";
                    var r = "0px 0px 0px";
                    t.transformOrigin = r, t.mozTransformOrigin = r, t.webkitTransformOrigin = r, t["-webkit-transform"] = r, t.contentVisibility = this.renderConfig.contentVisibility, this.animationItem.wrapper.appendChild(this.animationItem.container), this.canvasContext = this.animationItem.container.getContext("2d"), this.renderConfig.className && this.animationItem.container.setAttribute("class", this.renderConfig.className), this.renderConfig.id && this.animationItem.container.setAttribute("id", this.renderConfig.id);
                } else this.canvasContext = this.renderConfig.context;
                this.contextData.setContext(this.canvasContext), this.data = e, this.layers = e.layers, this.transformCanvas = {
                    w: e.w,
                    h: e.h,
                    sx: 0,
                    sy: 0,
                    tx: 0,
                    ty: 0
                }, this.setupGlobalData(e, document.body), this.globalData.canvasContext = this.canvasContext, this.globalData.renderer = this, this.globalData.isDashed = !1, this.globalData.progressiveLoad = this.renderConfig.progressiveLoad, this.globalData.transformCanvas = this.transformCanvas, this.elements = createSizedArray(e.layers.length), this.updateContainerSize();
            }, CanvasRendererBase.prototype.updateContainerSize = function(e, t) {
                this.reset();
                var r, i;
                e ? (r = e, i = t, this.canvasContext.canvas.width = r, this.canvasContext.canvas.height = i) : (this.animationItem.wrapper && this.animationItem.container ? (r = this.animationItem.wrapper.offsetWidth, i = this.animationItem.wrapper.offsetHeight) : (r = this.canvasContext.canvas.width, i = this.canvasContext.canvas.height), this.canvasContext.canvas.width = r * this.renderConfig.dpr, this.canvasContext.canvas.height = i * this.renderConfig.dpr);
                var s, a;
                if (this.renderConfig.preserveAspectRatio.indexOf("meet") !== -1 || this.renderConfig.preserveAspectRatio.indexOf("slice") !== -1) {
                    var o = this.renderConfig.preserveAspectRatio.split(" "), h = o[1] || "meet", c = o[0] || "xMidYMid", u = c.substr(0, 4), v = c.substr(4);
                    s = r / i, a = this.transformCanvas.w / this.transformCanvas.h, a > s && h === "meet" || a < s && h === "slice" ? (this.transformCanvas.sx = r / (this.transformCanvas.w / this.renderConfig.dpr), this.transformCanvas.sy = r / (this.transformCanvas.w / this.renderConfig.dpr)) : (this.transformCanvas.sx = i / (this.transformCanvas.h / this.renderConfig.dpr), this.transformCanvas.sy = i / (this.transformCanvas.h / this.renderConfig.dpr)), u === "xMid" && (a < s && h === "meet" || a > s && h === "slice") ? this.transformCanvas.tx = (r - this.transformCanvas.w * (i / this.transformCanvas.h)) / 2 * this.renderConfig.dpr : u === "xMax" && (a < s && h === "meet" || a > s && h === "slice") ? this.transformCanvas.tx = (r - this.transformCanvas.w * (i / this.transformCanvas.h)) * this.renderConfig.dpr : this.transformCanvas.tx = 0, v === "YMid" && (a > s && h === "meet" || a < s && h === "slice") ? this.transformCanvas.ty = (i - this.transformCanvas.h * (r / this.transformCanvas.w)) / 2 * this.renderConfig.dpr : v === "YMax" && (a > s && h === "meet" || a < s && h === "slice") ? this.transformCanvas.ty = (i - this.transformCanvas.h * (r / this.transformCanvas.w)) * this.renderConfig.dpr : this.transformCanvas.ty = 0;
                } else this.renderConfig.preserveAspectRatio === "none" ? (this.transformCanvas.sx = r / (this.transformCanvas.w / this.renderConfig.dpr), this.transformCanvas.sy = i / (this.transformCanvas.h / this.renderConfig.dpr), this.transformCanvas.tx = 0, this.transformCanvas.ty = 0) : (this.transformCanvas.sx = this.renderConfig.dpr, this.transformCanvas.sy = this.renderConfig.dpr, this.transformCanvas.tx = 0, this.transformCanvas.ty = 0);
                this.transformCanvas.props = [
                    this.transformCanvas.sx,
                    0,
                    0,
                    0,
                    0,
                    this.transformCanvas.sy,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    this.transformCanvas.tx,
                    this.transformCanvas.ty,
                    0,
                    1
                ], this.ctxTransform(this.transformCanvas.props), this.canvasContext.beginPath(), this.canvasContext.rect(0, 0, this.transformCanvas.w, this.transformCanvas.h), this.canvasContext.closePath(), this.canvasContext.clip(), this.renderFrame(this.renderedFrame, !0);
            }, CanvasRendererBase.prototype.destroy = function() {
                this.renderConfig.clearCanvas && this.animationItem.wrapper && (this.animationItem.wrapper.innerText = "");
                var e, t = this.layers ? this.layers.length : 0;
                for(e = t - 1; e >= 0; e -= 1)this.elements[e] && this.elements[e].destroy && this.elements[e].destroy();
                this.elements.length = 0, this.globalData.canvasContext = null, this.animationItem.container = null, this.destroyed = !0;
            }, CanvasRendererBase.prototype.renderFrame = function(e, t) {
                if (!(this.renderedFrame === e && this.renderConfig.clearCanvas === !0 && !t || this.destroyed || e === -1)) {
                    this.renderedFrame = e, this.globalData.frameNum = e - this.animationItem._isFirstFrame, this.globalData.frameId += 1, this.globalData._mdf = !this.renderConfig.clearCanvas || t, this.globalData.projectInterface.currentFrame = e;
                    var r, i = this.layers.length;
                    for(this.completeLayers || this.checkLayers(e), r = i - 1; r >= 0; r -= 1)(this.completeLayers || this.elements[r]) && this.elements[r].prepareFrame(e - this.layers[r].st);
                    if (this.globalData._mdf) {
                        for(this.renderConfig.clearCanvas === !0 ? this.canvasContext.clearRect(0, 0, this.transformCanvas.w, this.transformCanvas.h) : this.save(), r = i - 1; r >= 0; r -= 1)(this.completeLayers || this.elements[r]) && this.elements[r].renderFrame();
                        this.renderConfig.clearCanvas !== !0 && this.restore();
                    }
                }
            }, CanvasRendererBase.prototype.buildItem = function(e) {
                var t = this.elements;
                if (!(t[e] || this.layers[e].ty === 99)) {
                    var r = this.createItem(this.layers[e], this, this.globalData);
                    t[e] = r, r.initExpressions();
                }
            }, CanvasRendererBase.prototype.checkPendingElements = function() {
                for(; this.pendingElements.length;){
                    var e = this.pendingElements.pop();
                    e.checkParenting();
                }
            }, CanvasRendererBase.prototype.hide = function() {
                this.animationItem.container.style.display = "none";
            }, CanvasRendererBase.prototype.show = function() {
                this.animationItem.container.style.display = "block";
            };
            function CanvasContext() {
                this.opacity = -1, this.transform = createTypedArray("float32", 16), this.fillStyle = "", this.strokeStyle = "", this.lineWidth = "", this.lineCap = "", this.lineJoin = "", this.miterLimit = "", this.id = Math.random();
            }
            function CVContextData() {
                this.stack = [], this.cArrPos = 0, this.cTr = new Matrix;
                var e, t = 15;
                for(e = 0; e < t; e += 1){
                    var r = new CanvasContext;
                    this.stack[e] = r;
                }
                this._length = t, this.nativeContext = null, this.transformMat = new Matrix, this.currentOpacity = 1, this.currentFillStyle = "", this.appliedFillStyle = "", this.currentStrokeStyle = "", this.appliedStrokeStyle = "", this.currentLineWidth = "", this.appliedLineWidth = "", this.currentLineCap = "", this.appliedLineCap = "", this.currentLineJoin = "", this.appliedLineJoin = "", this.appliedMiterLimit = "", this.currentMiterLimit = "";
            }
            CVContextData.prototype.duplicate = function() {
                var e = this._length * 2, t = 0;
                for(t = this._length; t < e; t += 1)this.stack[t] = new CanvasContext;
                this._length = e;
            }, CVContextData.prototype.reset = function() {
                this.cArrPos = 0, this.cTr.reset(), this.stack[this.cArrPos].opacity = 1;
            }, CVContextData.prototype.restore = function(e) {
                this.cArrPos -= 1;
                var t = this.stack[this.cArrPos], r = t.transform, i, s = this.cTr.props;
                for(i = 0; i < 16; i += 1)s[i] = r[i];
                if (e) {
                    this.nativeContext.restore();
                    var a = this.stack[this.cArrPos + 1];
                    this.appliedFillStyle = a.fillStyle, this.appliedStrokeStyle = a.strokeStyle, this.appliedLineWidth = a.lineWidth, this.appliedLineCap = a.lineCap, this.appliedLineJoin = a.lineJoin, this.appliedMiterLimit = a.miterLimit;
                }
                this.nativeContext.setTransform(r[0], r[1], r[4], r[5], r[12], r[13]), (e || t.opacity !== -1 && this.currentOpacity !== t.opacity) && (this.nativeContext.globalAlpha = t.opacity, this.currentOpacity = t.opacity), this.currentFillStyle = t.fillStyle, this.currentStrokeStyle = t.strokeStyle, this.currentLineWidth = t.lineWidth, this.currentLineCap = t.lineCap, this.currentLineJoin = t.lineJoin, this.currentMiterLimit = t.miterLimit;
            }, CVContextData.prototype.save = function(e) {
                e && this.nativeContext.save();
                var t = this.cTr.props;
                this._length <= this.cArrPos && this.duplicate();
                var r = this.stack[this.cArrPos], i;
                for(i = 0; i < 16; i += 1)r.transform[i] = t[i];
                this.cArrPos += 1;
                var s = this.stack[this.cArrPos];
                s.opacity = r.opacity, s.fillStyle = r.fillStyle, s.strokeStyle = r.strokeStyle, s.lineWidth = r.lineWidth, s.lineCap = r.lineCap, s.lineJoin = r.lineJoin, s.miterLimit = r.miterLimit;
            }, CVContextData.prototype.setOpacity = function(e) {
                this.stack[this.cArrPos].opacity = e;
            }, CVContextData.prototype.setContext = function(e) {
                this.nativeContext = e;
            }, CVContextData.prototype.fillStyle = function(e) {
                this.stack[this.cArrPos].fillStyle !== e && (this.currentFillStyle = e, this.stack[this.cArrPos].fillStyle = e);
            }, CVContextData.prototype.strokeStyle = function(e) {
                this.stack[this.cArrPos].strokeStyle !== e && (this.currentStrokeStyle = e, this.stack[this.cArrPos].strokeStyle = e);
            }, CVContextData.prototype.lineWidth = function(e) {
                this.stack[this.cArrPos].lineWidth !== e && (this.currentLineWidth = e, this.stack[this.cArrPos].lineWidth = e);
            }, CVContextData.prototype.lineCap = function(e) {
                this.stack[this.cArrPos].lineCap !== e && (this.currentLineCap = e, this.stack[this.cArrPos].lineCap = e);
            }, CVContextData.prototype.lineJoin = function(e) {
                this.stack[this.cArrPos].lineJoin !== e && (this.currentLineJoin = e, this.stack[this.cArrPos].lineJoin = e);
            }, CVContextData.prototype.miterLimit = function(e) {
                this.stack[this.cArrPos].miterLimit !== e && (this.currentMiterLimit = e, this.stack[this.cArrPos].miterLimit = e);
            }, CVContextData.prototype.transform = function(e) {
                this.transformMat.cloneFromProps(e);
                var t = this.cTr;
                this.transformMat.multiply(t), t.cloneFromProps(this.transformMat.props);
                var r = t.props;
                this.nativeContext.setTransform(r[0], r[1], r[4], r[5], r[12], r[13]);
            }, CVContextData.prototype.opacity = function(e) {
                var t = this.stack[this.cArrPos].opacity;
                t *= e < 0 ? 0 : e, this.stack[this.cArrPos].opacity !== t && (this.currentOpacity !== e && (this.nativeContext.globalAlpha = e, this.currentOpacity = e), this.stack[this.cArrPos].opacity = t);
            }, CVContextData.prototype.fill = function(e) {
                this.appliedFillStyle !== this.currentFillStyle && (this.appliedFillStyle = this.currentFillStyle, this.nativeContext.fillStyle = this.appliedFillStyle), this.nativeContext.fill(e);
            }, CVContextData.prototype.fillRect = function(e, t, r, i) {
                this.appliedFillStyle !== this.currentFillStyle && (this.appliedFillStyle = this.currentFillStyle, this.nativeContext.fillStyle = this.appliedFillStyle), this.nativeContext.fillRect(e, t, r, i);
            }, CVContextData.prototype.stroke = function() {
                this.appliedStrokeStyle !== this.currentStrokeStyle && (this.appliedStrokeStyle = this.currentStrokeStyle, this.nativeContext.strokeStyle = this.appliedStrokeStyle), this.appliedLineWidth !== this.currentLineWidth && (this.appliedLineWidth = this.currentLineWidth, this.nativeContext.lineWidth = this.appliedLineWidth), this.appliedLineCap !== this.currentLineCap && (this.appliedLineCap = this.currentLineCap, this.nativeContext.lineCap = this.appliedLineCap), this.appliedLineJoin !== this.currentLineJoin && (this.appliedLineJoin = this.currentLineJoin, this.nativeContext.lineJoin = this.appliedLineJoin), this.appliedMiterLimit !== this.currentMiterLimit && (this.appliedMiterLimit = this.currentMiterLimit, this.nativeContext.miterLimit = this.appliedMiterLimit), this.nativeContext.stroke();
            };
            function CVCompElement(e, t, r) {
                this.completeLayers = !1, this.layers = e.layers, this.pendingElements = [], this.elements = createSizedArray(this.layers.length), this.initElement(e, t, r), this.tm = e.tm ? PropertyFactory.getProp(this, e.tm, 0, t.frameRate, this) : {
                    _placeholder: !0
                };
            }
            extendPrototype([
                CanvasRendererBase,
                ICompElement,
                CVBaseElement
            ], CVCompElement), CVCompElement.prototype.renderInnerContent = function() {
                var e = this.canvasContext;
                e.beginPath(), e.moveTo(0, 0), e.lineTo(this.data.w, 0), e.lineTo(this.data.w, this.data.h), e.lineTo(0, this.data.h), e.lineTo(0, 0), e.clip();
                var t, r = this.layers.length;
                for(t = r - 1; t >= 0; t -= 1)(this.completeLayers || this.elements[t]) && this.elements[t].renderFrame();
            }, CVCompElement.prototype.destroy = function() {
                var e, t = this.layers.length;
                for(e = t - 1; e >= 0; e -= 1)this.elements[e] && this.elements[e].destroy();
                this.layers = null, this.elements = null;
            }, CVCompElement.prototype.createComp = function(e) {
                return new CVCompElement(e, this.globalData, this);
            };
            function CanvasRenderer(e, t) {
                this.animationItem = e, this.renderConfig = {
                    clearCanvas: t && t.clearCanvas !== void 0 ? t.clearCanvas : !0,
                    context: t && t.context || null,
                    progressiveLoad: t && t.progressiveLoad || !1,
                    preserveAspectRatio: t && t.preserveAspectRatio || "xMidYMid meet",
                    imagePreserveAspectRatio: t && t.imagePreserveAspectRatio || "xMidYMid slice",
                    contentVisibility: t && t.contentVisibility || "visible",
                    className: t && t.className || "",
                    id: t && t.id || "",
                    runExpressions: !t || t.runExpressions === void 0 || t.runExpressions
                }, this.renderConfig.dpr = t && t.dpr || 1, this.animationItem.wrapper && (this.renderConfig.dpr = t && t.dpr || window.devicePixelRatio || 1), this.renderedFrame = -1, this.globalData = {
                    frameNum: -1,
                    _mdf: !1,
                    renderConfig: this.renderConfig,
                    currentGlobalAlpha: -1
                }, this.contextData = new CVContextData, this.elements = [], this.pendingElements = [], this.transformMat = new Matrix, this.completeLayers = !1, this.rendererType = "canvas", this.renderConfig.clearCanvas && (this.ctxTransform = this.contextData.transform.bind(this.contextData), this.ctxOpacity = this.contextData.opacity.bind(this.contextData), this.ctxFillStyle = this.contextData.fillStyle.bind(this.contextData), this.ctxStrokeStyle = this.contextData.strokeStyle.bind(this.contextData), this.ctxLineWidth = this.contextData.lineWidth.bind(this.contextData), this.ctxLineCap = this.contextData.lineCap.bind(this.contextData), this.ctxLineJoin = this.contextData.lineJoin.bind(this.contextData), this.ctxMiterLimit = this.contextData.miterLimit.bind(this.contextData), this.ctxFill = this.contextData.fill.bind(this.contextData), this.ctxFillRect = this.contextData.fillRect.bind(this.contextData), this.ctxStroke = this.contextData.stroke.bind(this.contextData), this.save = this.contextData.save.bind(this.contextData));
            }
            extendPrototype([
                CanvasRendererBase
            ], CanvasRenderer), CanvasRenderer.prototype.createComp = function(e) {
                return new CVCompElement(e, this.globalData, this);
            };
            function HBaseElement() {}
            HBaseElement.prototype = {
                checkBlendMode: function() {},
                initRendererElement: function() {
                    this.baseElement = createTag(this.data.tg || "div"), this.data.hasMask ? (this.svgElement = createNS("svg"), this.layerElement = createNS("g"), this.maskedElement = this.layerElement, this.svgElement.appendChild(this.layerElement), this.baseElement.appendChild(this.svgElement)) : this.layerElement = this.baseElement, styleDiv(this.baseElement);
                },
                createContainerElements: function() {
                    this.renderableEffectsManager = new CVEffects(this), this.transformedElement = this.baseElement, this.maskedElement = this.layerElement, this.data.ln && this.layerElement.setAttribute("id", this.data.ln), this.data.cl && this.layerElement.setAttribute("class", this.data.cl), this.data.bm !== 0 && this.setBlendMode();
                },
                renderElement: function() {
                    var t = this.transformedElement ? this.transformedElement.style : {};
                    if (this.finalTransform._matMdf) {
                        var r = this.finalTransform.mat.toCSS();
                        t.transform = r, t.webkitTransform = r;
                    }
                    this.finalTransform._opMdf && (t.opacity = this.finalTransform.mProp.o.v);
                },
                renderFrame: function() {
                    this.data.hd || this.hidden || (this.renderTransform(), this.renderRenderable(), this.renderElement(), this.renderInnerContent(), this._isFirstFrame && (this._isFirstFrame = !1));
                },
                destroy: function() {
                    this.layerElement = null, this.transformedElement = null, this.matteElement && (this.matteElement = null), this.maskManager && (this.maskManager.destroy(), this.maskManager = null);
                },
                createRenderableComponents: function() {
                    this.maskManager = new MaskElement(this.data, this, this.globalData);
                },
                addEffects: function() {},
                setMatte: function() {}
            }, HBaseElement.prototype.getBaseElement = SVGBaseElement.prototype.getBaseElement, HBaseElement.prototype.destroyBaseElement = HBaseElement.prototype.destroy, HBaseElement.prototype.buildElementParenting = BaseRenderer.prototype.buildElementParenting;
            function HSolidElement(e, t, r) {
                this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                HBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement
            ], HSolidElement), HSolidElement.prototype.createContent = function() {
                var e;
                this.data.hasMask ? (e = createNS("rect"), e.setAttribute("width", this.data.sw), e.setAttribute("height", this.data.sh), e.setAttribute("fill", this.data.sc), this.svgElement.setAttribute("width", this.data.sw), this.svgElement.setAttribute("height", this.data.sh)) : (e = createTag("div"), e.style.width = this.data.sw + "px", e.style.height = this.data.sh + "px", e.style.backgroundColor = this.data.sc), this.layerElement.appendChild(e);
            };
            function HShapeElement(e, t, r) {
                this.shapes = [], this.shapesData = e.shapes, this.stylesList = [], this.shapeModifiers = [], this.itemsData = [], this.processedElements = [], this.animatedContents = [], this.shapesContainer = createNS("g"), this.initElement(e, t, r), this.prevViewData = [], this.currentBBox = {
                    x: 999999,
                    y: -999999,
                    h: 0,
                    w: 0
                };
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                HSolidElement,
                SVGShapeElement,
                HBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableElement
            ], HShapeElement), HShapeElement.prototype._renderShapeFrame = HShapeElement.prototype.renderInnerContent, HShapeElement.prototype.createContent = function() {
                var e;
                if (this.baseElement.style.fontSize = 0, this.data.hasMask) this.layerElement.appendChild(this.shapesContainer), e = this.svgElement;
                else {
                    e = createNS("svg");
                    var t = this.comp.data ? this.comp.data : this.globalData.compSize;
                    e.setAttribute("width", t.w), e.setAttribute("height", t.h), e.appendChild(this.shapesContainer), this.layerElement.appendChild(e);
                }
                this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, this.shapesContainer, 0, [], !0), this.filterUniqueShapes(), this.shapeCont = e;
            }, HShapeElement.prototype.getTransformedPoint = function(e, t) {
                var r, i = e.length;
                for(r = 0; r < i; r += 1)t = e[r].mProps.v.applyToPointArray(t[0], t[1], 0);
                return t;
            }, HShapeElement.prototype.calculateShapeBoundingBox = function(e, t) {
                var r = e.sh.v, i = e.transformers, s, a = r._length, o, h, c, u;
                if (!(a <= 1)) {
                    for(s = 0; s < a - 1; s += 1)o = this.getTransformedPoint(i, r.v[s]), h = this.getTransformedPoint(i, r.o[s]), c = this.getTransformedPoint(i, r.i[s + 1]), u = this.getTransformedPoint(i, r.v[s + 1]), this.checkBounds(o, h, c, u, t);
                    r.c && (o = this.getTransformedPoint(i, r.v[s]), h = this.getTransformedPoint(i, r.o[s]), c = this.getTransformedPoint(i, r.i[0]), u = this.getTransformedPoint(i, r.v[0]), this.checkBounds(o, h, c, u, t));
                }
            }, HShapeElement.prototype.checkBounds = function(e, t, r, i, s) {
                this.getBoundsOfCurve(e, t, r, i);
                var a = this.shapeBoundingBox;
                s.x = bmMin(a.left, s.x), s.xMax = bmMax(a.right, s.xMax), s.y = bmMin(a.top, s.y), s.yMax = bmMax(a.bottom, s.yMax);
            }, HShapeElement.prototype.shapeBoundingBox = {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }, HShapeElement.prototype.tempBoundingBox = {
                x: 0,
                xMax: 0,
                y: 0,
                yMax: 0,
                width: 0,
                height: 0
            }, HShapeElement.prototype.getBoundsOfCurve = function(e, t, r, i) {
                for(var s = [
                    [
                        e[0],
                        i[0]
                    ],
                    [
                        e[1],
                        i[1]
                    ]
                ], a, o, h, c, u, v, C, d = 0; d < 2; ++d)o = 6 * e[d] - 12 * t[d] + 6 * r[d], a = -3 * e[d] + 9 * t[d] - 9 * r[d] + 3 * i[d], h = 3 * t[d] - 3 * e[d], o |= 0, a |= 0, h |= 0, a === 0 && o === 0 || (a === 0 ? (c = -h / o, c > 0 && c < 1 && s[d].push(this.calculateF(c, e, t, r, i, d))) : (u = o * o - 4 * h * a, u >= 0 && (v = (-o + bmSqrt(u)) / (2 * a), v > 0 && v < 1 && s[d].push(this.calculateF(v, e, t, r, i, d)), C = (-o - bmSqrt(u)) / (2 * a), C > 0 && C < 1 && s[d].push(this.calculateF(C, e, t, r, i, d)))));
                this.shapeBoundingBox.left = bmMin.apply(null, s[0]), this.shapeBoundingBox.top = bmMin.apply(null, s[1]), this.shapeBoundingBox.right = bmMax.apply(null, s[0]), this.shapeBoundingBox.bottom = bmMax.apply(null, s[1]);
            }, HShapeElement.prototype.calculateF = function(e, t, r, i, s, a) {
                return bmPow(1 - e, 3) * t[a] + 3 * bmPow(1 - e, 2) * e * r[a] + 3 * (1 - e) * bmPow(e, 2) * i[a] + bmPow(e, 3) * s[a];
            }, HShapeElement.prototype.calculateBoundingBox = function(e, t) {
                var r, i = e.length;
                for(r = 0; r < i; r += 1)e[r] && e[r].sh ? this.calculateShapeBoundingBox(e[r], t) : e[r] && e[r].it ? this.calculateBoundingBox(e[r].it, t) : e[r] && e[r].style && e[r].w && this.expandStrokeBoundingBox(e[r].w, t);
            }, HShapeElement.prototype.expandStrokeBoundingBox = function(e, t) {
                var r = 0;
                if (e.keyframes) {
                    for(var i = 0; i < e.keyframes.length; i += 1){
                        var s = e.keyframes[i].s;
                        s > r && (r = s);
                    }
                    r *= e.mult;
                } else r = e.v * e.mult;
                t.x -= r, t.xMax += r, t.y -= r, t.yMax += r;
            }, HShapeElement.prototype.currentBoxContains = function(e) {
                return this.currentBBox.x <= e.x && this.currentBBox.y <= e.y && this.currentBBox.width + this.currentBBox.x >= e.x + e.width && this.currentBBox.height + this.currentBBox.y >= e.y + e.height;
            }, HShapeElement.prototype.renderInnerContent = function() {
                if (this._renderShapeFrame(), !this.hidden && (this._isFirstFrame || this._mdf)) {
                    var e = this.tempBoundingBox, t = 999999;
                    if (e.x = t, e.xMax = -t, e.y = t, e.yMax = -t, this.calculateBoundingBox(this.itemsData, e), e.width = e.xMax < e.x ? 0 : e.xMax - e.x, e.height = e.yMax < e.y ? 0 : e.yMax - e.y, this.currentBoxContains(e)) return;
                    var r = !1;
                    if (this.currentBBox.w !== e.width && (this.currentBBox.w = e.width, this.shapeCont.setAttribute("width", e.width), r = !0), this.currentBBox.h !== e.height && (this.currentBBox.h = e.height, this.shapeCont.setAttribute("height", e.height), r = !0), r || this.currentBBox.x !== e.x || this.currentBBox.y !== e.y) {
                        this.currentBBox.w = e.width, this.currentBBox.h = e.height, this.currentBBox.x = e.x, this.currentBBox.y = e.y, this.shapeCont.setAttribute("viewBox", this.currentBBox.x + " " + this.currentBBox.y + " " + this.currentBBox.w + " " + this.currentBBox.h);
                        var i = this.shapeCont.style, s = "translate(" + this.currentBBox.x + "px," + this.currentBBox.y + "px)";
                        i.transform = s, i.webkitTransform = s;
                    }
                }
            };
            function HTextElement(e, t, r) {
                this.textSpans = [], this.textPaths = [], this.currentBBox = {
                    x: 999999,
                    y: -999999,
                    h: 0,
                    w: 0
                }, this.renderType = "svg", this.isMasked = !1, this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                HBaseElement,
                HierarchyElement,
                FrameElement,
                RenderableDOMElement,
                ITextElement
            ], HTextElement), HTextElement.prototype.createContent = function() {
                if (this.isMasked = this.checkMasks(), this.isMasked) {
                    this.renderType = "svg", this.compW = this.comp.data.w, this.compH = this.comp.data.h, this.svgElement.setAttribute("width", this.compW), this.svgElement.setAttribute("height", this.compH);
                    var e = createNS("g");
                    this.maskedElement.appendChild(e), this.innerElem = e;
                } else this.renderType = "html", this.innerElem = this.layerElement;
                this.checkParenting();
            }, HTextElement.prototype.buildNewText = function() {
                var e = this.textProperty.currentData;
                this.renderedLetters = createSizedArray(e.l ? e.l.length : 0);
                var t = this.innerElem.style, r = e.fc ? this.buildColor(e.fc) : "rgba(0,0,0,0)";
                t.fill = r, t.color = r, e.sc && (t.stroke = this.buildColor(e.sc), t.strokeWidth = e.sw + "px");
                var i = this.globalData.fontManager.getFontByName(e.f);
                if (!this.globalData.fontManager.chars) if (t.fontSize = e.finalSize + "px", t.lineHeight = e.finalSize + "px", i.fClass) this.innerElem.className = i.fClass;
                else {
                    t.fontFamily = i.fFamily;
                    var s = e.fWeight, a = e.fStyle;
                    t.fontStyle = a, t.fontWeight = s;
                }
                var o, h, c = e.l;
                h = c.length;
                var u, v, C, d = this.mHelper, S, _ = "", g = 0;
                for(o = 0; o < h; o += 1){
                    if (this.globalData.fontManager.chars ? (this.textPaths[g] ? u = this.textPaths[g] : (u = createNS("path"), u.setAttribute("stroke-linecap", lineCapEnum[1]), u.setAttribute("stroke-linejoin", lineJoinEnum[2]), u.setAttribute("stroke-miterlimit", "4")), this.isMasked || (this.textSpans[g] ? (v = this.textSpans[g], C = v.children[0]) : (v = createTag("div"), v.style.lineHeight = 0, C = createNS("svg"), C.appendChild(u), styleDiv(v)))) : this.isMasked ? u = this.textPaths[g] ? this.textPaths[g] : createNS("text") : this.textSpans[g] ? (v = this.textSpans[g], u = this.textPaths[g]) : (v = createTag("span"), styleDiv(v), u = createTag("span"), styleDiv(u), v.appendChild(u)), this.globalData.fontManager.chars) {
                        var T = this.globalData.fontManager.getCharData(e.finalText[o], i.fStyle, this.globalData.fontManager.getFontByName(e.f).fFamily), x;
                        if (T ? x = T.data : x = null, d.reset(), x && x.shapes && x.shapes.length && (S = x.shapes[0].it, d.scale(e.finalSize / 100, e.finalSize / 100), _ = this.createPathShape(d, S), u.setAttribute("d", _)), this.isMasked) this.innerElem.appendChild(u);
                        else {
                            if (this.innerElem.appendChild(v), x && x.shapes) {
                                document.body.appendChild(C);
                                var E = C.getBBox();
                                C.setAttribute("width", E.width + 2), C.setAttribute("height", E.height + 2), C.setAttribute("viewBox", E.x - 1 + " " + (E.y - 1) + " " + (E.width + 2) + " " + (E.height + 2));
                                var y = C.style, b = "translate(" + (E.x - 1) + "px," + (E.y - 1) + "px)";
                                y.transform = b, y.webkitTransform = b, c[o].yOffset = E.y - 1;
                            } else C.setAttribute("width", 1), C.setAttribute("height", 1);
                            v.appendChild(C);
                        }
                    } else if (u.textContent = c[o].val, u.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve"), this.isMasked) this.innerElem.appendChild(u);
                    else {
                        this.innerElem.appendChild(v);
                        var w = u.style, j = "translate3d(0," + -e.finalSize / 1.2 + "px,0)";
                        w.transform = j, w.webkitTransform = j;
                    }
                    this.isMasked ? this.textSpans[g] = u : this.textSpans[g] = v, this.textSpans[g].style.display = "block", this.textPaths[g] = u, g += 1;
                }
                for(; g < this.textSpans.length;)this.textSpans[g].style.display = "none", g += 1;
            }, HTextElement.prototype.renderInnerContent = function() {
                this.validateText();
                var e;
                if (this.data.singleShape) {
                    if (!this._isFirstFrame && !this.lettersChangedFlag) return;
                    if (this.isMasked && this.finalTransform._matMdf) {
                        this.svgElement.setAttribute("viewBox", -this.finalTransform.mProp.p.v[0] + " " + -this.finalTransform.mProp.p.v[1] + " " + this.compW + " " + this.compH), e = this.svgElement.style;
                        var t = "translate(" + -this.finalTransform.mProp.p.v[0] + "px," + -this.finalTransform.mProp.p.v[1] + "px)";
                        e.transform = t, e.webkitTransform = t;
                    }
                }
                if (this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag), !(!this.lettersChangedFlag && !this.textAnimator.lettersChangedFlag)) {
                    var r, i, s = 0, a = this.textAnimator.renderedLetters, o = this.textProperty.currentData.l;
                    i = o.length;
                    var h, c, u;
                    for(r = 0; r < i; r += 1)o[r].n ? s += 1 : (c = this.textSpans[r], u = this.textPaths[r], h = a[s], s += 1, h._mdf.m && (this.isMasked ? c.setAttribute("transform", h.m) : (c.style.webkitTransform = h.m, c.style.transform = h.m)), c.style.opacity = h.o, h.sw && h._mdf.sw && u.setAttribute("stroke-width", h.sw), h.sc && h._mdf.sc && u.setAttribute("stroke", h.sc), h.fc && h._mdf.fc && (u.setAttribute("fill", h.fc), u.style.color = h.fc));
                    if (this.innerElem.getBBox && !this.hidden && (this._isFirstFrame || this._mdf)) {
                        var v = this.innerElem.getBBox();
                        this.currentBBox.w !== v.width && (this.currentBBox.w = v.width, this.svgElement.setAttribute("width", v.width)), this.currentBBox.h !== v.height && (this.currentBBox.h = v.height, this.svgElement.setAttribute("height", v.height));
                        var C = 1;
                        if (this.currentBBox.w !== v.width + C * 2 || this.currentBBox.h !== v.height + C * 2 || this.currentBBox.x !== v.x - C || this.currentBBox.y !== v.y - C) {
                            this.currentBBox.w = v.width + C * 2, this.currentBBox.h = v.height + C * 2, this.currentBBox.x = v.x - C, this.currentBBox.y = v.y - C, this.svgElement.setAttribute("viewBox", this.currentBBox.x + " " + this.currentBBox.y + " " + this.currentBBox.w + " " + this.currentBBox.h), e = this.svgElement.style;
                            var d = "translate(" + this.currentBBox.x + "px," + this.currentBBox.y + "px)";
                            e.transform = d, e.webkitTransform = d;
                        }
                    }
                }
            };
            function HCameraElement(e, t, r) {
                this.initFrame(), this.initBaseData(e, t, r), this.initHierarchy();
                var i = PropertyFactory.getProp;
                if (this.pe = i(this, e.pe, 0, 0, this), e.ks.p.s ? (this.px = i(this, e.ks.p.x, 1, 0, this), this.py = i(this, e.ks.p.y, 1, 0, this), this.pz = i(this, e.ks.p.z, 1, 0, this)) : this.p = i(this, e.ks.p, 1, 0, this), e.ks.a && (this.a = i(this, e.ks.a, 1, 0, this)), e.ks.or.k.length && e.ks.or.k[0].to) {
                    var s, a = e.ks.or.k.length;
                    for(s = 0; s < a; s += 1)e.ks.or.k[s].to = null, e.ks.or.k[s].ti = null;
                }
                this.or = i(this, e.ks.or, 1, degToRads, this), this.or.sh = !0, this.rx = i(this, e.ks.rx, 0, degToRads, this), this.ry = i(this, e.ks.ry, 0, degToRads, this), this.rz = i(this, e.ks.rz, 0, degToRads, this), this.mat = new Matrix, this._prevMat = new Matrix, this._isFirstFrame = !0, this.finalTransform = {
                    mProp: this
                };
            }
            extendPrototype([
                BaseElement,
                FrameElement,
                HierarchyElement
            ], HCameraElement), HCameraElement.prototype.setup = function() {
                var e, t = this.comp.threeDElements.length, r, i, s;
                for(e = 0; e < t; e += 1)if (r = this.comp.threeDElements[e], r.type === "3d") {
                    i = r.perspectiveElem.style, s = r.container.style;
                    var a = this.pe.v + "px", o = "0px 0px 0px", h = "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
                    i.perspective = a, i.webkitPerspective = a, s.transformOrigin = o, s.mozTransformOrigin = o, s.webkitTransformOrigin = o, i.transform = h, i.webkitTransform = h;
                }
            }, HCameraElement.prototype.createElements = function() {}, HCameraElement.prototype.hide = function() {}, HCameraElement.prototype.renderFrame = function() {
                var e = this._isFirstFrame, t, r;
                if (this.hierarchy) for(r = this.hierarchy.length, t = 0; t < r; t += 1)e = this.hierarchy[t].finalTransform.mProp._mdf || e;
                if (e || this.pe._mdf || this.p && this.p._mdf || this.px && (this.px._mdf || this.py._mdf || this.pz._mdf) || this.rx._mdf || this.ry._mdf || this.rz._mdf || this.or._mdf || this.a && this.a._mdf) {
                    if (this.mat.reset(), this.hierarchy) for(r = this.hierarchy.length - 1, t = r; t >= 0; t -= 1){
                        var i = this.hierarchy[t].finalTransform.mProp;
                        this.mat.translate(-i.p.v[0], -i.p.v[1], i.p.v[2]), this.mat.rotateX(-i.or.v[0]).rotateY(-i.or.v[1]).rotateZ(i.or.v[2]), this.mat.rotateX(-i.rx.v).rotateY(-i.ry.v).rotateZ(i.rz.v), this.mat.scale(1 / i.s.v[0], 1 / i.s.v[1], 1 / i.s.v[2]), this.mat.translate(i.a.v[0], i.a.v[1], i.a.v[2]);
                    }
                    if (this.p ? this.mat.translate(-this.p.v[0], -this.p.v[1], this.p.v[2]) : this.mat.translate(-this.px.v, -this.py.v, this.pz.v), this.a) {
                        var s;
                        this.p ? s = [
                            this.p.v[0] - this.a.v[0],
                            this.p.v[1] - this.a.v[1],
                            this.p.v[2] - this.a.v[2]
                        ] : s = [
                            this.px.v - this.a.v[0],
                            this.py.v - this.a.v[1],
                            this.pz.v - this.a.v[2]
                        ];
                        var a = Math.sqrt(Math.pow(s[0], 2) + Math.pow(s[1], 2) + Math.pow(s[2], 2)), o = [
                            s[0] / a,
                            s[1] / a,
                            s[2] / a
                        ], h = Math.sqrt(o[2] * o[2] + o[0] * o[0]), c = Math.atan2(o[1], h), u = Math.atan2(o[0], -o[2]);
                        this.mat.rotateY(u).rotateX(-c);
                    }
                    this.mat.rotateX(-this.rx.v).rotateY(-this.ry.v).rotateZ(this.rz.v), this.mat.rotateX(-this.or.v[0]).rotateY(-this.or.v[1]).rotateZ(this.or.v[2]), this.mat.translate(this.globalData.compSize.w / 2, this.globalData.compSize.h / 2, 0), this.mat.translate(0, 0, this.pe.v);
                    var v = !this._prevMat.equals(this.mat);
                    if ((v || this.pe._mdf) && this.comp.threeDElements) {
                        r = this.comp.threeDElements.length;
                        var C, d, S;
                        for(t = 0; t < r; t += 1)if (C = this.comp.threeDElements[t], C.type === "3d") {
                            if (v) {
                                var _ = this.mat.toCSS();
                                S = C.container.style, S.transform = _, S.webkitTransform = _;
                            }
                            this.pe._mdf && (d = C.perspectiveElem.style, d.perspective = this.pe.v + "px", d.webkitPerspective = this.pe.v + "px");
                        }
                        this.mat.clone(this._prevMat);
                    }
                }
                this._isFirstFrame = !1;
            }, HCameraElement.prototype.prepareFrame = function(e) {
                this.prepareProperties(e, !0);
            }, HCameraElement.prototype.destroy = function() {}, HCameraElement.prototype.getBaseElement = function() {
                return null;
            };
            function HImageElement(e, t, r) {
                this.assetData = t.getAssetData(e.refId), this.initElement(e, t, r);
            }
            extendPrototype([
                BaseElement,
                TransformElement,
                HBaseElement,
                HSolidElement,
                HierarchyElement,
                FrameElement,
                RenderableElement
            ], HImageElement), HImageElement.prototype.createContent = function() {
                var e = this.globalData.getAssetsPath(this.assetData), t = new Image;
                this.data.hasMask ? (this.imageElem = createNS("image"), this.imageElem.setAttribute("width", this.assetData.w + "px"), this.imageElem.setAttribute("height", this.assetData.h + "px"), this.imageElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", e), this.layerElement.appendChild(this.imageElem), this.baseElement.setAttribute("width", this.assetData.w), this.baseElement.setAttribute("height", this.assetData.h)) : this.layerElement.appendChild(t), t.crossOrigin = "anonymous", t.src = e, this.data.ln && this.baseElement.setAttribute("id", this.data.ln);
            };
            function HybridRendererBase(e, t) {
                this.animationItem = e, this.layers = null, this.renderedFrame = -1, this.renderConfig = {
                    className: t && t.className || "",
                    imagePreserveAspectRatio: t && t.imagePreserveAspectRatio || "xMidYMid slice",
                    hideOnTransparent: !(t && t.hideOnTransparent === !1),
                    filterSize: {
                        width: t && t.filterSize && t.filterSize.width || "400%",
                        height: t && t.filterSize && t.filterSize.height || "400%",
                        x: t && t.filterSize && t.filterSize.x || "-100%",
                        y: t && t.filterSize && t.filterSize.y || "-100%"
                    }
                }, this.globalData = {
                    _mdf: !1,
                    frameNum: -1,
                    renderConfig: this.renderConfig
                }, this.pendingElements = [], this.elements = [], this.threeDElements = [], this.destroyed = !1, this.camera = null, this.supports3d = !0, this.rendererType = "html";
            }
            extendPrototype([
                BaseRenderer
            ], HybridRendererBase), HybridRendererBase.prototype.buildItem = SVGRenderer.prototype.buildItem, HybridRendererBase.prototype.checkPendingElements = function() {
                for(; this.pendingElements.length;){
                    var e = this.pendingElements.pop();
                    e.checkParenting();
                }
            }, HybridRendererBase.prototype.appendElementInPos = function(e, t) {
                var r = e.getBaseElement();
                if (r) {
                    var i = this.layers[t];
                    if (!i.ddd || !this.supports3d) if (this.threeDElements) this.addTo3dContainer(r, t);
                    else {
                        for(var s = 0, a, o, h; s < t;)this.elements[s] && this.elements[s] !== !0 && this.elements[s].getBaseElement && (o = this.elements[s], h = this.layers[s].ddd ? this.getThreeDContainerByPos(s) : o.getBaseElement(), a = h || a), s += 1;
                        a ? (!i.ddd || !this.supports3d) && this.layerElement.insertBefore(r, a) : (!i.ddd || !this.supports3d) && this.layerElement.appendChild(r);
                    }
                    else this.addTo3dContainer(r, t);
                }
            }, HybridRendererBase.prototype.createShape = function(e) {
                return this.supports3d ? new HShapeElement(e, this.globalData, this) : new SVGShapeElement(e, this.globalData, this);
            }, HybridRendererBase.prototype.createText = function(e) {
                return this.supports3d ? new HTextElement(e, this.globalData, this) : new SVGTextLottieElement(e, this.globalData, this);
            }, HybridRendererBase.prototype.createCamera = function(e) {
                return this.camera = new HCameraElement(e, this.globalData, this), this.camera;
            }, HybridRendererBase.prototype.createImage = function(e) {
                return this.supports3d ? new HImageElement(e, this.globalData, this) : new IImageElement(e, this.globalData, this);
            }, HybridRendererBase.prototype.createSolid = function(e) {
                return this.supports3d ? new HSolidElement(e, this.globalData, this) : new ISolidElement(e, this.globalData, this);
            }, HybridRendererBase.prototype.createNull = SVGRenderer.prototype.createNull, HybridRendererBase.prototype.getThreeDContainerByPos = function(e) {
                for(var t = 0, r = this.threeDElements.length; t < r;){
                    if (this.threeDElements[t].startPos <= e && this.threeDElements[t].endPos >= e) return this.threeDElements[t].perspectiveElem;
                    t += 1;
                }
                return null;
            }, HybridRendererBase.prototype.createThreeDContainer = function(e, t) {
                var r = createTag("div"), i, s;
                styleDiv(r);
                var a = createTag("div");
                if (styleDiv(a), t === "3d") {
                    i = r.style, i.width = this.globalData.compSize.w + "px", i.height = this.globalData.compSize.h + "px";
                    var o = "50% 50%";
                    i.webkitTransformOrigin = o, i.mozTransformOrigin = o, i.transformOrigin = o, s = a.style;
                    var h = "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
                    s.transform = h, s.webkitTransform = h;
                }
                r.appendChild(a);
                var c = {
                    container: a,
                    perspectiveElem: r,
                    startPos: e,
                    endPos: e,
                    type: t
                };
                return this.threeDElements.push(c), c;
            }, HybridRendererBase.prototype.build3dContainers = function() {
                var e, t = this.layers.length, r, i = "";
                for(e = 0; e < t; e += 1)this.layers[e].ddd && this.layers[e].ty !== 3 ? (i !== "3d" && (i = "3d", r = this.createThreeDContainer(e, "3d")), r.endPos = Math.max(r.endPos, e)) : (i !== "2d" && (i = "2d", r = this.createThreeDContainer(e, "2d")), r.endPos = Math.max(r.endPos, e));
                for(t = this.threeDElements.length, e = t - 1; e >= 0; e -= 1)this.resizerElem.appendChild(this.threeDElements[e].perspectiveElem);
            }, HybridRendererBase.prototype.addTo3dContainer = function(e, t) {
                for(var r = 0, i = this.threeDElements.length; r < i;){
                    if (t <= this.threeDElements[r].endPos) {
                        for(var s = this.threeDElements[r].startPos, a; s < t;)this.elements[s] && this.elements[s].getBaseElement && (a = this.elements[s].getBaseElement()), s += 1;
                        a ? this.threeDElements[r].container.insertBefore(e, a) : this.threeDElements[r].container.appendChild(e);
                        break;
                    }
                    r += 1;
                }
            }, HybridRendererBase.prototype.configAnimation = function(e) {
                var t = createTag("div"), r = this.animationItem.wrapper, i = t.style;
                i.width = e.w + "px", i.height = e.h + "px", this.resizerElem = t, styleDiv(t), i.transformStyle = "flat", i.mozTransformStyle = "flat", i.webkitTransformStyle = "flat", this.renderConfig.className && t.setAttribute("class", this.renderConfig.className), r.appendChild(t), i.overflow = "hidden";
                var s = createNS("svg");
                s.setAttribute("width", "1"), s.setAttribute("height", "1"), styleDiv(s), this.resizerElem.appendChild(s);
                var a = createNS("defs");
                s.appendChild(a), this.data = e, this.setupGlobalData(e, s), this.globalData.defs = a, this.layers = e.layers, this.layerElement = this.resizerElem, this.build3dContainers(), this.updateContainerSize();
            }, HybridRendererBase.prototype.destroy = function() {
                this.animationItem.wrapper && (this.animationItem.wrapper.innerText = ""), this.animationItem.container = null, this.globalData.defs = null;
                var e, t = this.layers ? this.layers.length : 0;
                for(e = 0; e < t; e += 1)this.elements[e] && this.elements[e].destroy && this.elements[e].destroy();
                this.elements.length = 0, this.destroyed = !0, this.animationItem = null;
            }, HybridRendererBase.prototype.updateContainerSize = function() {
                var e = this.animationItem.wrapper.offsetWidth, t = this.animationItem.wrapper.offsetHeight, r = e / t, i = this.globalData.compSize.w / this.globalData.compSize.h, s, a, o, h;
                i > r ? (s = e / this.globalData.compSize.w, a = e / this.globalData.compSize.w, o = 0, h = (t - this.globalData.compSize.h * (e / this.globalData.compSize.w)) / 2) : (s = t / this.globalData.compSize.h, a = t / this.globalData.compSize.h, o = (e - this.globalData.compSize.w * (t / this.globalData.compSize.h)) / 2, h = 0);
                var c = this.resizerElem.style;
                c.webkitTransform = "matrix3d(" + s + ",0,0,0,0," + a + ",0,0,0,0,1,0," + o + "," + h + ",0,1)", c.transform = c.webkitTransform;
            }, HybridRendererBase.prototype.renderFrame = SVGRenderer.prototype.renderFrame, HybridRendererBase.prototype.hide = function() {
                this.resizerElem.style.display = "none";
            }, HybridRendererBase.prototype.show = function() {
                this.resizerElem.style.display = "block";
            }, HybridRendererBase.prototype.initItems = function() {
                if (this.buildAllItems(), this.camera) this.camera.setup();
                else {
                    var e = this.globalData.compSize.w, t = this.globalData.compSize.h, r, i = this.threeDElements.length;
                    for(r = 0; r < i; r += 1){
                        var s = this.threeDElements[r].perspectiveElem.style;
                        s.webkitPerspective = Math.sqrt(Math.pow(e, 2) + Math.pow(t, 2)) + "px", s.perspective = s.webkitPerspective;
                    }
                }
            }, HybridRendererBase.prototype.searchExtraCompositions = function(e) {
                var t, r = e.length, i = createTag("div");
                for(t = 0; t < r; t += 1)if (e[t].xt) {
                    var s = this.createComp(e[t], i, this.globalData.comp, null);
                    s.initExpressions(), this.globalData.projectInterface.registerComposition(s);
                }
            };
            function HCompElement(e, t, r) {
                this.layers = e.layers, this.supports3d = !e.hasMask, this.completeLayers = !1, this.pendingElements = [], this.elements = this.layers ? createSizedArray(this.layers.length) : [], this.initElement(e, t, r), this.tm = e.tm ? PropertyFactory.getProp(this, e.tm, 0, t.frameRate, this) : {
                    _placeholder: !0
                };
            }
            extendPrototype([
                HybridRendererBase,
                ICompElement,
                HBaseElement
            ], HCompElement), HCompElement.prototype._createBaseContainerElements = HCompElement.prototype.createContainerElements, HCompElement.prototype.createContainerElements = function() {
                this._createBaseContainerElements(), this.data.hasMask ? (this.svgElement.setAttribute("width", this.data.w), this.svgElement.setAttribute("height", this.data.h), this.transformedElement = this.baseElement) : this.transformedElement = this.layerElement;
            }, HCompElement.prototype.addTo3dContainer = function(e, t) {
                for(var r = 0, i; r < t;)this.elements[r] && this.elements[r].getBaseElement && (i = this.elements[r].getBaseElement()), r += 1;
                i ? this.layerElement.insertBefore(e, i) : this.layerElement.appendChild(e);
            }, HCompElement.prototype.createComp = function(e) {
                return this.supports3d ? new HCompElement(e, this.globalData, this) : new SVGCompElement(e, this.globalData, this);
            };
            function HybridRenderer(e, t) {
                this.animationItem = e, this.layers = null, this.renderedFrame = -1, this.renderConfig = {
                    className: t && t.className || "",
                    imagePreserveAspectRatio: t && t.imagePreserveAspectRatio || "xMidYMid slice",
                    hideOnTransparent: !(t && t.hideOnTransparent === !1),
                    filterSize: {
                        width: t && t.filterSize && t.filterSize.width || "400%",
                        height: t && t.filterSize && t.filterSize.height || "400%",
                        x: t && t.filterSize && t.filterSize.x || "-100%",
                        y: t && t.filterSize && t.filterSize.y || "-100%"
                    },
                    runExpressions: !t || t.runExpressions === void 0 || t.runExpressions
                }, this.globalData = {
                    _mdf: !1,
                    frameNum: -1,
                    renderConfig: this.renderConfig
                }, this.pendingElements = [], this.elements = [], this.threeDElements = [], this.destroyed = !1, this.camera = null, this.supports3d = !0, this.rendererType = "html";
            }
            extendPrototype([
                HybridRendererBase
            ], HybridRenderer), HybridRenderer.prototype.createComp = function(e) {
                return this.supports3d ? new HCompElement(e, this.globalData, this) : new SVGCompElement(e, this.globalData, this);
            };
            var CompExpressionInterface = function() {
                return function(e) {
                    function t(r) {
                        for(var i = 0, s = e.layers.length; i < s;){
                            if (e.layers[i].nm === r || e.layers[i].ind === r) return e.elements[i].layerInterface;
                            i += 1;
                        }
                        return null;
                    }
                    return Object.defineProperty(t, "_name", {
                        value: e.data.nm
                    }), t.layer = t, t.pixelAspect = 1, t.height = e.data.h || e.globalData.compSize.h, t.width = e.data.w || e.globalData.compSize.w, t.pixelAspect = 1, t.frameDuration = 1 / e.globalData.frameRate, t.displayStartTime = 0, t.numLayers = e.layers.length, t;
                };
            }();
            function _typeof$2(e) {
                "@babel/helpers - typeof";
                return _typeof$2 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$2(e);
            }
            function seedRandom(e, t) {
                var r = this, i = 256, s = 6, a = 52, o = "random", h = t.pow(i, s), c = t.pow(2, a), u = c * 2, v = i - 1, C;
                function d(y, b, w) {
                    var j = [];
                    b = b === !0 ? {
                        entropy: !0
                    } : b || {};
                    var M = T(g(b.entropy ? [
                        y,
                        E(e)
                    ] : y === null ? x() : y, 3), j), I = new S(j), D = function() {
                        for(var G = I.g(s), V = h, U = 0; G < c;)G = (G + U) * i, V *= i, U = I.g(1);
                        for(; G >= u;)G /= 2, V /= 2, U >>>= 1;
                        return (G + U) / V;
                    };
                    return D.int32 = function() {
                        return I.g(4) | 0;
                    }, D.quick = function() {
                        return I.g(4) / 4294967296;
                    }, D.double = D, T(E(I.S), e), (b.pass || w || function(B, G, V, U) {
                        return U && (U.S && _(U, I), B.state = function() {
                            return _(I, {});
                        }), V ? (t[o] = B, G) : B;
                    })(D, M, "global" in b ? b.global : this == t, b.state);
                }
                t["seed" + o] = d;
                function S(y) {
                    var b, w = y.length, j = this, M = 0, I = j.i = j.j = 0, D = j.S = [];
                    for(w || (y = [
                        w++
                    ]); M < i;)D[M] = M++;
                    for(M = 0; M < i; M++)D[M] = D[I = v & I + y[M % w] + (b = D[M])], D[I] = b;
                    j.g = function(B) {
                        for(var G, V = 0, U = j.i, W = j.j, z = j.S; B--;)G = z[U = v & U + 1], V = V * i + z[v & (z[U] = z[W = v & W + G]) + (z[W] = G)];
                        return j.i = U, j.j = W, V;
                    };
                }
                function _(y, b) {
                    return b.i = y.i, b.j = y.j, b.S = y.S.slice(), b;
                }
                function g(y, b) {
                    var w = [], j = _typeof$2(y), M;
                    if (b && j == "object") for(M in y)try {
                        w.push(g(y[M], b - 1));
                    } catch  {}
                    return w.length ? w : j == "string" ? y : y + "\0";
                }
                function T(y, b) {
                    for(var w = y + "", j, M = 0; M < w.length;)b[v & M] = v & (j ^= b[v & M] * 19) + w.charCodeAt(M++);
                    return E(b);
                }
                function x() {
                    try {
                        var y = new Uint8Array(i);
                        return (r.crypto || r.msCrypto).getRandomValues(y), E(y);
                    } catch  {
                        var b = r.navigator, w = b && b.plugins;
                        return [
                            +new Date,
                            r,
                            w,
                            r.screen,
                            E(e)
                        ];
                    }
                }
                function E(y) {
                    return String.fromCharCode.apply(0, y);
                }
                T(t.random(), e);
            }
            function initialize$2(e) {
                seedRandom([], e);
            }
            var propTypes = {
                SHAPE: "shape"
            };
            function _typeof$1(e) {
                "@babel/helpers - typeof";
                return _typeof$1 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof$1(e);
            }
            var ExpressionManager = function() {
                var ob = {}, Math = BMMath, window = null, document = null, XMLHttpRequest = null, fetch = null, frames = null, _lottieGlobal = {};
                initialize$2(BMMath);
                function resetFrame() {
                    _lottieGlobal = {};
                }
                function $bm_isInstanceOfArray(e) {
                    return e.constructor === Array || e.constructor === Float32Array;
                }
                function isNumerable(e, t) {
                    return e === "number" || t instanceof Number || e === "boolean" || e === "string";
                }
                function $bm_neg(e) {
                    var t = _typeof$1(e);
                    if (t === "number" || e instanceof Number || t === "boolean") return -e;
                    if ($bm_isInstanceOfArray(e)) {
                        var r, i = e.length, s = [];
                        for(r = 0; r < i; r += 1)s[r] = -e[r];
                        return s;
                    }
                    return e.propType ? e.v : -e;
                }
                var easeInBez = BezierFactory.getBezierEasing(.333, 0, .833, .833, "easeIn").get, easeOutBez = BezierFactory.getBezierEasing(.167, .167, .667, 1, "easeOut").get, easeInOutBez = BezierFactory.getBezierEasing(.33, 0, .667, 1, "easeInOut").get;
                function sum(e, t) {
                    var r = _typeof$1(e), i = _typeof$1(t);
                    if (isNumerable(r, e) && isNumerable(i, t) || r === "string" || i === "string") return e + t;
                    if ($bm_isInstanceOfArray(e) && isNumerable(i, t)) return e = e.slice(0), e[0] += t, e;
                    if (isNumerable(r, e) && $bm_isInstanceOfArray(t)) return t = t.slice(0), t[0] = e + t[0], t;
                    if ($bm_isInstanceOfArray(e) && $bm_isInstanceOfArray(t)) {
                        for(var s = 0, a = e.length, o = t.length, h = []; s < a || s < o;)(typeof e[s] == "number" || e[s] instanceof Number) && (typeof t[s] == "number" || t[s] instanceof Number) ? h[s] = e[s] + t[s] : h[s] = t[s] === void 0 ? e[s] : e[s] || t[s], s += 1;
                        return h;
                    }
                    return 0;
                }
                var add = sum;
                function sub(e, t) {
                    var r = _typeof$1(e), i = _typeof$1(t);
                    if (isNumerable(r, e) && isNumerable(i, t)) return r === "string" && (e = parseInt(e, 10)), i === "string" && (t = parseInt(t, 10)), e - t;
                    if ($bm_isInstanceOfArray(e) && isNumerable(i, t)) return e = e.slice(0), e[0] -= t, e;
                    if (isNumerable(r, e) && $bm_isInstanceOfArray(t)) return t = t.slice(0), t[0] = e - t[0], t;
                    if ($bm_isInstanceOfArray(e) && $bm_isInstanceOfArray(t)) {
                        for(var s = 0, a = e.length, o = t.length, h = []; s < a || s < o;)(typeof e[s] == "number" || e[s] instanceof Number) && (typeof t[s] == "number" || t[s] instanceof Number) ? h[s] = e[s] - t[s] : h[s] = t[s] === void 0 ? e[s] : e[s] || t[s], s += 1;
                        return h;
                    }
                    return 0;
                }
                function mul(e, t) {
                    var r = _typeof$1(e), i = _typeof$1(t), s;
                    if (isNumerable(r, e) && isNumerable(i, t)) return e * t;
                    var a, o;
                    if ($bm_isInstanceOfArray(e) && isNumerable(i, t)) {
                        for(o = e.length, s = createTypedArray("float32", o), a = 0; a < o; a += 1)s[a] = e[a] * t;
                        return s;
                    }
                    if (isNumerable(r, e) && $bm_isInstanceOfArray(t)) {
                        for(o = t.length, s = createTypedArray("float32", o), a = 0; a < o; a += 1)s[a] = e * t[a];
                        return s;
                    }
                    return 0;
                }
                function div(e, t) {
                    var r = _typeof$1(e), i = _typeof$1(t), s;
                    if (isNumerable(r, e) && isNumerable(i, t)) return e / t;
                    var a, o;
                    if ($bm_isInstanceOfArray(e) && isNumerable(i, t)) {
                        for(o = e.length, s = createTypedArray("float32", o), a = 0; a < o; a += 1)s[a] = e[a] / t;
                        return s;
                    }
                    if (isNumerable(r, e) && $bm_isInstanceOfArray(t)) {
                        for(o = t.length, s = createTypedArray("float32", o), a = 0; a < o; a += 1)s[a] = e / t[a];
                        return s;
                    }
                    return 0;
                }
                function mod(e, t) {
                    return typeof e == "string" && (e = parseInt(e, 10)), typeof t == "string" && (t = parseInt(t, 10)), e % t;
                }
                var $bm_sum = sum, $bm_sub = sub, $bm_mul = mul, $bm_div = div, $bm_mod = mod;
                function clamp(e, t, r) {
                    if (t > r) {
                        var i = r;
                        r = t, t = i;
                    }
                    return Math.min(Math.max(e, t), r);
                }
                function radiansToDegrees(e) {
                    return e / degToRads;
                }
                var radians_to_degrees = radiansToDegrees;
                function degreesToRadians(e) {
                    return e * degToRads;
                }
                var degrees_to_radians = radiansToDegrees, helperLengthArray = [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ];
                function length(e, t) {
                    if (typeof e == "number" || e instanceof Number) return t = t || 0, Math.abs(e - t);
                    t || (t = helperLengthArray);
                    var r, i = Math.min(e.length, t.length), s = 0;
                    for(r = 0; r < i; r += 1)s += Math.pow(t[r] - e[r], 2);
                    return Math.sqrt(s);
                }
                function normalize(e) {
                    return div(e, length(e));
                }
                function rgbToHsl(e) {
                    var t = e[0], r = e[1], i = e[2], s = Math.max(t, r, i), a = Math.min(t, r, i), o, h, c = (s + a) / 2;
                    if (s === a) o = 0, h = 0;
                    else {
                        var u = s - a;
                        switch(h = c > .5 ? u / (2 - s - a) : u / (s + a), s){
                            case t:
                                o = (r - i) / u + (r < i ? 6 : 0);
                                break;
                            case r:
                                o = (i - t) / u + 2;
                                break;
                            case i:
                                o = (t - r) / u + 4;
                                break;
                        }
                        o /= 6;
                    }
                    return [
                        o,
                        h,
                        c,
                        e[3]
                    ];
                }
                function hue2rgb(e, t, r) {
                    return r < 0 && (r += 1), r > 1 && (r -= 1), r < 1 / 6 ? e + (t - e) * 6 * r : r < 1 / 2 ? t : r < 2 / 3 ? e + (t - e) * (2 / 3 - r) * 6 : e;
                }
                function hslToRgb(e) {
                    var t = e[0], r = e[1], i = e[2], s, a, o;
                    if (r === 0) s = i, o = i, a = i;
                    else {
                        var h = i < .5 ? i * (1 + r) : i + r - i * r, c = 2 * i - h;
                        s = hue2rgb(c, h, t + 1 / 3), a = hue2rgb(c, h, t), o = hue2rgb(c, h, t - 1 / 3);
                    }
                    return [
                        s,
                        a,
                        o,
                        e[3]
                    ];
                }
                function linear(e, t, r, i, s) {
                    if ((i === void 0 || s === void 0) && (i = t, s = r, t = 0, r = 1), r < t) {
                        var a = r;
                        r = t, t = a;
                    }
                    if (e <= t) return i;
                    if (e >= r) return s;
                    var o = r === t ? 0 : (e - t) / (r - t);
                    if (!i.length) return i + (s - i) * o;
                    var h, c = i.length, u = createTypedArray("float32", c);
                    for(h = 0; h < c; h += 1)u[h] = i[h] + (s[h] - i[h]) * o;
                    return u;
                }
                function random(e, t) {
                    if (t === void 0 && (e === void 0 ? (e = 0, t = 1) : (t = e, e = void 0)), t.length) {
                        var r, i = t.length;
                        e || (e = createTypedArray("float32", i));
                        var s = createTypedArray("float32", i), a = BMMath.random();
                        for(r = 0; r < i; r += 1)s[r] = e[r] + a * (t[r] - e[r]);
                        return s;
                    }
                    e === void 0 && (e = 0);
                    var o = BMMath.random();
                    return e + o * (t - e);
                }
                function createPath(e, t, r, i) {
                    var s, a = e.length, o = shapePool.newElement();
                    o.setPathData(!!i, a);
                    var h = [
                        0,
                        0
                    ], c, u;
                    for(s = 0; s < a; s += 1)c = t && t[s] ? t[s] : h, u = r && r[s] ? r[s] : h, o.setTripleAt(e[s][0], e[s][1], u[0] + e[s][0], u[1] + e[s][1], c[0] + e[s][0], c[1] + e[s][1], s, !0);
                    return o;
                }
                function initiateExpression(elem, data, property) {
                    function noOp(e) {
                        return e;
                    }
                    if (!elem.globalData.renderConfig.runExpressions) return noOp;
                    var val = data.x, needsVelocity = /velocity(?![\w\d])/.test(val), _needsRandom = val.indexOf("random") !== -1, elemType = elem.data.ty, transform, $bm_transform, content, effect, thisProperty = property;
                    thisProperty._name = elem.data.nm, thisProperty.valueAtTime = thisProperty.getValueAtTime, Object.defineProperty(thisProperty, "value", {
                        get: function() {
                            return thisProperty.v;
                        }
                    }), elem.comp.frameDuration = 1 / elem.comp.globalData.frameRate, elem.comp.displayStartTime = 0;
                    var inPoint = elem.data.ip / elem.comp.globalData.frameRate, outPoint = elem.data.op / elem.comp.globalData.frameRate, width = elem.data.sw ? elem.data.sw : 0, height = elem.data.sh ? elem.data.sh : 0, name = elem.data.nm, loopIn, loop_in, loopOut, loop_out, smooth, toWorld, fromWorld, fromComp, toComp, fromCompToSurface, position, rotation, anchorPoint, scale, thisLayer, thisComp, mask, valueAtTime, velocityAtTime, scoped_bm_rt, expression_function = eval("[function _expression_function(){" + val + ";scoped_bm_rt=$bm_rt}]")[0], numKeys = property.kf ? data.k.length : 0, active = !this.data || this.data.hd !== !0, wiggle = function e(t, r) {
                        var i, s, a = this.pv.length ? this.pv.length : 1, o = createTypedArray("float32", a);
                        t = 5;
                        var h = Math.floor(time * t);
                        for(i = 0, s = 0; i < h;){
                            for(s = 0; s < a; s += 1)o[s] += -r + r * 2 * BMMath.random();
                            i += 1;
                        }
                        var c = time * t, u = c - Math.floor(c), v = createTypedArray("float32", a);
                        if (a > 1) {
                            for(s = 0; s < a; s += 1)v[s] = this.pv[s] + o[s] + (-r + r * 2 * BMMath.random()) * u;
                            return v;
                        }
                        return this.pv + o[0] + (-r + r * 2 * BMMath.random()) * u;
                    }.bind(this);
                    thisProperty.loopIn && (loopIn = thisProperty.loopIn.bind(thisProperty), loop_in = loopIn), thisProperty.loopOut && (loopOut = thisProperty.loopOut.bind(thisProperty), loop_out = loopOut), thisProperty.smooth && (smooth = thisProperty.smooth.bind(thisProperty));
                    function loopInDuration(e, t) {
                        return loopIn(e, t, !0);
                    }
                    function loopOutDuration(e, t) {
                        return loopOut(e, t, !0);
                    }
                    this.getValueAtTime && (valueAtTime = this.getValueAtTime.bind(this)), this.getVelocityAtTime && (velocityAtTime = this.getVelocityAtTime.bind(this));
                    var comp = elem.comp.globalData.projectInterface.bind(elem.comp.globalData.projectInterface);
                    function lookAt(e, t) {
                        var r = [
                            t[0] - e[0],
                            t[1] - e[1],
                            t[2] - e[2]
                        ], i = Math.atan2(r[0], Math.sqrt(r[1] * r[1] + r[2] * r[2])) / degToRads, s = -Math.atan2(r[1], r[2]) / degToRads;
                        return [
                            s,
                            i,
                            0
                        ];
                    }
                    function easeOut(e, t, r, i, s) {
                        return applyEase(easeOutBez, e, t, r, i, s);
                    }
                    function easeIn(e, t, r, i, s) {
                        return applyEase(easeInBez, e, t, r, i, s);
                    }
                    function ease(e, t, r, i, s) {
                        return applyEase(easeInOutBez, e, t, r, i, s);
                    }
                    function applyEase(e, t, r, i, s, a) {
                        s === void 0 ? (s = r, a = i) : t = (t - r) / (i - r), t > 1 ? t = 1 : t < 0 && (t = 0);
                        var o = e(t);
                        if ($bm_isInstanceOfArray(s)) {
                            var h, c = s.length, u = createTypedArray("float32", c);
                            for(h = 0; h < c; h += 1)u[h] = (a[h] - s[h]) * o + s[h];
                            return u;
                        }
                        return (a - s) * o + s;
                    }
                    function nearestKey(e) {
                        var t, r = data.k.length, i, s;
                        if (!data.k.length || typeof data.k[0] == "number") i = 0, s = 0;
                        else if (i = -1, e *= elem.comp.globalData.frameRate, e < data.k[0].t) i = 1, s = data.k[0].t;
                        else {
                            for(t = 0; t < r - 1; t += 1)if (e === data.k[t].t) {
                                i = t + 1, s = data.k[t].t;
                                break;
                            } else if (e > data.k[t].t && e < data.k[t + 1].t) {
                                e - data.k[t].t > data.k[t + 1].t - e ? (i = t + 2, s = data.k[t + 1].t) : (i = t + 1, s = data.k[t].t);
                                break;
                            }
                            i === -1 && (i = t + 1, s = data.k[t].t);
                        }
                        var a = {};
                        return a.index = i, a.time = s / elem.comp.globalData.frameRate, a;
                    }
                    function key(e) {
                        var t, r, i;
                        if (!data.k.length || typeof data.k[0] == "number") throw new Error("The property has no keyframe at index " + e);
                        e -= 1, t = {
                            time: data.k[e].t / elem.comp.globalData.frameRate,
                            value: []
                        };
                        var s = Object.prototype.hasOwnProperty.call(data.k[e], "s") ? data.k[e].s : data.k[e - 1].e;
                        for(i = s.length, r = 0; r < i; r += 1)t[r] = s[r], t.value[r] = s[r];
                        return t;
                    }
                    function framesToTime(e, t) {
                        return t || (t = elem.comp.globalData.frameRate), e / t;
                    }
                    function timeToFrames(e, t) {
                        return !e && e !== 0 && (e = time), t || (t = elem.comp.globalData.frameRate), e * t;
                    }
                    function seedRandom(e) {
                        BMMath.seedrandom(randSeed + e);
                    }
                    function sourceRectAtTime() {
                        return elem.sourceRectAtTime();
                    }
                    function substring(e, t) {
                        return typeof value == "string" ? t === void 0 ? value.substring(e) : value.substring(e, t) : "";
                    }
                    function substr(e, t) {
                        return typeof value == "string" ? t === void 0 ? value.substr(e) : value.substr(e, t) : "";
                    }
                    function posterizeTime(e) {
                        time = e === 0 ? 0 : Math.floor(time * e) / e, value = valueAtTime(time);
                    }
                    var time, velocity, value, text, textIndex, textTotal, selectorValue, index = elem.data.ind, hasParent = !!(elem.hierarchy && elem.hierarchy.length), parent, randSeed = Math.floor(Math.random() * 1e6), globalData = elem.globalData;
                    function executeExpression(e) {
                        return value = e, this.frameExpressionId === elem.globalData.frameId && this.propType !== "textSelector" ? value : (this.propType === "textSelector" && (textIndex = this.textIndex, textTotal = this.textTotal, selectorValue = this.selectorValue), thisLayer || (text = elem.layerInterface.text, thisLayer = elem.layerInterface, thisComp = elem.comp.compInterface, toWorld = thisLayer.toWorld.bind(thisLayer), fromWorld = thisLayer.fromWorld.bind(thisLayer), fromComp = thisLayer.fromComp.bind(thisLayer), toComp = thisLayer.toComp.bind(thisLayer), mask = thisLayer.mask ? thisLayer.mask.bind(thisLayer) : null, fromCompToSurface = fromComp), transform || (transform = elem.layerInterface("ADBE Transform Group"), $bm_transform = transform, transform && (anchorPoint = transform.anchorPoint)), elemType === 4 && !content && (content = thisLayer("ADBE Root Vectors Group")), effect || (effect = thisLayer(4)), hasParent = !!(elem.hierarchy && elem.hierarchy.length), hasParent && !parent && (parent = elem.hierarchy[0].layerInterface), time = this.comp.renderedFrame / this.comp.globalData.frameRate, _needsRandom && seedRandom(randSeed + time), needsVelocity && (velocity = velocityAtTime(time)), expression_function(), this.frameExpressionId = elem.globalData.frameId, scoped_bm_rt = scoped_bm_rt.propType === propTypes.SHAPE ? scoped_bm_rt.v : scoped_bm_rt, scoped_bm_rt);
                    }
                    return executeExpression.__preventDeadCodeRemoval = [
                        $bm_transform,
                        anchorPoint,
                        time,
                        velocity,
                        inPoint,
                        outPoint,
                        width,
                        height,
                        name,
                        loop_in,
                        loop_out,
                        smooth,
                        toComp,
                        fromCompToSurface,
                        toWorld,
                        fromWorld,
                        mask,
                        position,
                        rotation,
                        scale,
                        thisComp,
                        numKeys,
                        active,
                        wiggle,
                        loopInDuration,
                        loopOutDuration,
                        comp,
                        lookAt,
                        easeOut,
                        easeIn,
                        ease,
                        nearestKey,
                        key,
                        text,
                        textIndex,
                        textTotal,
                        selectorValue,
                        framesToTime,
                        timeToFrames,
                        sourceRectAtTime,
                        substring,
                        substr,
                        posterizeTime,
                        index,
                        globalData
                    ], executeExpression;
                }
                return ob.initiateExpression = initiateExpression, ob.__preventDeadCodeRemoval = [
                    window,
                    document,
                    XMLHttpRequest,
                    fetch,
                    frames,
                    $bm_neg,
                    add,
                    $bm_sum,
                    $bm_sub,
                    $bm_mul,
                    $bm_div,
                    $bm_mod,
                    clamp,
                    radians_to_degrees,
                    degreesToRadians,
                    degrees_to_radians,
                    normalize,
                    rgbToHsl,
                    hslToRgb,
                    linear,
                    random,
                    createPath,
                    _lottieGlobal
                ], ob.resetFrame = resetFrame, ob;
            }(), Expressions = function() {
                var e = {};
                e.initExpressions = t, e.resetFrame = ExpressionManager.resetFrame;
                function t(r) {
                    var i = 0, s = [];
                    function a() {
                        i += 1;
                    }
                    function o() {
                        i -= 1, i === 0 && c();
                    }
                    function h(u) {
                        s.indexOf(u) === -1 && s.push(u);
                    }
                    function c() {
                        var u, v = s.length;
                        for(u = 0; u < v; u += 1)s[u].release();
                        s.length = 0;
                    }
                    r.renderer.compInterface = CompExpressionInterface(r.renderer), r.renderer.globalData.projectInterface.registerComposition(r.renderer), r.renderer.globalData.pushExpression = a, r.renderer.globalData.popExpression = o, r.renderer.globalData.registerExpressionProperty = h;
                }
                return e;
            }(), MaskManagerInterface = function() {
                function e(r, i) {
                    this._mask = r, this._data = i;
                }
                Object.defineProperty(e.prototype, "maskPath", {
                    get: function() {
                        return this._mask.prop.k && this._mask.prop.getValue(), this._mask.prop;
                    }
                }), Object.defineProperty(e.prototype, "maskOpacity", {
                    get: function() {
                        return this._mask.op.k && this._mask.op.getValue(), this._mask.op.v * 100;
                    }
                });
                var t = function(i) {
                    var s = createSizedArray(i.viewData.length), a, o = i.viewData.length;
                    for(a = 0; a < o; a += 1)s[a] = new e(i.viewData[a], i.masksProperties[a]);
                    var h = function(u) {
                        for(a = 0; a < o;){
                            if (i.masksProperties[a].nm === u) return s[a];
                            a += 1;
                        }
                        return null;
                    };
                    return h;
                };
                return t;
            }(), ExpressionPropertyInterface = function() {
                var e = {
                    pv: 0,
                    v: 0,
                    mult: 1
                }, t = {
                    pv: [
                        0,
                        0,
                        0
                    ],
                    v: [
                        0,
                        0,
                        0
                    ],
                    mult: 1
                };
                function r(o, h, c) {
                    Object.defineProperty(o, "velocity", {
                        get: function() {
                            return h.getVelocityAtTime(h.comp.currentFrame);
                        }
                    }), o.numKeys = h.keyframes ? h.keyframes.length : 0, o.key = function(u) {
                        if (!o.numKeys) return 0;
                        var v = "";
                        "s" in h.keyframes[u - 1] ? v = h.keyframes[u - 1].s : "e" in h.keyframes[u - 2] ? v = h.keyframes[u - 2].e : v = h.keyframes[u - 2].s;
                        var C = c === "unidimensional" ? new Number(v) : Object.assign({}, v);
                        return C.time = h.keyframes[u - 1].t / h.elem.comp.globalData.frameRate, C.value = c === "unidimensional" ? v[0] : v, C;
                    }, o.valueAtTime = h.getValueAtTime, o.speedAtTime = h.getSpeedAtTime, o.velocityAtTime = h.getVelocityAtTime, o.propertyGroup = h.propertyGroup;
                }
                function i(o) {
                    (!o || !("pv" in o)) && (o = e);
                    var h = 1 / o.mult, c = o.pv * h, u = new Number(c);
                    return u.value = c, r(u, o, "unidimensional"), function() {
                        return o.k && o.getValue(), c = o.v * h, u.value !== c && (u = new Number(c), u.value = c, u[0] = c, r(u, o, "unidimensional")), u;
                    };
                }
                function s(o) {
                    (!o || !("pv" in o)) && (o = t);
                    var h = 1 / o.mult, c = o.data && o.data.l || o.pv.length, u = createTypedArray("float32", c), v = createTypedArray("float32", c);
                    return u.value = v, r(u, o, "multidimensional"), function() {
                        o.k && o.getValue();
                        for(var C = 0; C < c; C += 1)v[C] = o.v[C] * h, u[C] = v[C];
                        return u;
                    };
                }
                function a() {
                    return e;
                }
                return function(o) {
                    return o ? o.propType === "unidimensional" ? i(o) : s(o) : a;
                };
            }(), TransformExpressionInterface = function() {
                return function(e) {
                    function t(o) {
                        switch(o){
                            case "scale":
                            case "Scale":
                            case "ADBE Scale":
                            case 6:
                                return t.scale;
                            case "rotation":
                            case "Rotation":
                            case "ADBE Rotation":
                            case "ADBE Rotate Z":
                            case 10:
                                return t.rotation;
                            case "ADBE Rotate X":
                                return t.xRotation;
                            case "ADBE Rotate Y":
                                return t.yRotation;
                            case "position":
                            case "Position":
                            case "ADBE Position":
                            case 2:
                                return t.position;
                            case "ADBE Position_0":
                                return t.xPosition;
                            case "ADBE Position_1":
                                return t.yPosition;
                            case "ADBE Position_2":
                                return t.zPosition;
                            case "anchorPoint":
                            case "AnchorPoint":
                            case "Anchor Point":
                            case "ADBE AnchorPoint":
                            case 1:
                                return t.anchorPoint;
                            case "opacity":
                            case "Opacity":
                            case 11:
                                return t.opacity;
                            default:
                                return null;
                        }
                    }
                    Object.defineProperty(t, "rotation", {
                        get: ExpressionPropertyInterface(e.r || e.rz)
                    }), Object.defineProperty(t, "zRotation", {
                        get: ExpressionPropertyInterface(e.rz || e.r)
                    }), Object.defineProperty(t, "xRotation", {
                        get: ExpressionPropertyInterface(e.rx)
                    }), Object.defineProperty(t, "yRotation", {
                        get: ExpressionPropertyInterface(e.ry)
                    }), Object.defineProperty(t, "scale", {
                        get: ExpressionPropertyInterface(e.s)
                    });
                    var r, i, s, a;
                    return e.p ? a = ExpressionPropertyInterface(e.p) : (r = ExpressionPropertyInterface(e.px), i = ExpressionPropertyInterface(e.py), e.pz && (s = ExpressionPropertyInterface(e.pz))), Object.defineProperty(t, "position", {
                        get: function() {
                            return e.p ? a() : [
                                r(),
                                i(),
                                s ? s() : 0
                            ];
                        }
                    }), Object.defineProperty(t, "xPosition", {
                        get: ExpressionPropertyInterface(e.px)
                    }), Object.defineProperty(t, "yPosition", {
                        get: ExpressionPropertyInterface(e.py)
                    }), Object.defineProperty(t, "zPosition", {
                        get: ExpressionPropertyInterface(e.pz)
                    }), Object.defineProperty(t, "anchorPoint", {
                        get: ExpressionPropertyInterface(e.a)
                    }), Object.defineProperty(t, "opacity", {
                        get: ExpressionPropertyInterface(e.o)
                    }), Object.defineProperty(t, "skew", {
                        get: ExpressionPropertyInterface(e.sk)
                    }), Object.defineProperty(t, "skewAxis", {
                        get: ExpressionPropertyInterface(e.sa)
                    }), Object.defineProperty(t, "orientation", {
                        get: ExpressionPropertyInterface(e.or)
                    }), t;
                };
            }(), LayerExpressionInterface = function() {
                function e(u) {
                    var v = new Matrix;
                    if (u !== void 0) {
                        var C = this._elem.finalTransform.mProp.getValueAtTime(u);
                        C.clone(v);
                    } else {
                        var d = this._elem.finalTransform.mProp;
                        d.applyToMatrix(v);
                    }
                    return v;
                }
                function t(u, v) {
                    var C = this.getMatrix(v);
                    return C.props[12] = 0, C.props[13] = 0, C.props[14] = 0, this.applyPoint(C, u);
                }
                function r(u, v) {
                    var C = this.getMatrix(v);
                    return this.applyPoint(C, u);
                }
                function i(u, v) {
                    var C = this.getMatrix(v);
                    return C.props[12] = 0, C.props[13] = 0, C.props[14] = 0, this.invertPoint(C, u);
                }
                function s(u, v) {
                    var C = this.getMatrix(v);
                    return this.invertPoint(C, u);
                }
                function a(u, v) {
                    if (this._elem.hierarchy && this._elem.hierarchy.length) {
                        var C, d = this._elem.hierarchy.length;
                        for(C = 0; C < d; C += 1)this._elem.hierarchy[C].finalTransform.mProp.applyToMatrix(u);
                    }
                    return u.applyToPointArray(v[0], v[1], v[2] || 0);
                }
                function o(u, v) {
                    if (this._elem.hierarchy && this._elem.hierarchy.length) {
                        var C, d = this._elem.hierarchy.length;
                        for(C = 0; C < d; C += 1)this._elem.hierarchy[C].finalTransform.mProp.applyToMatrix(u);
                    }
                    return u.inversePoint(v);
                }
                function h(u) {
                    var v = new Matrix;
                    if (v.reset(), this._elem.finalTransform.mProp.applyToMatrix(v), this._elem.hierarchy && this._elem.hierarchy.length) {
                        var C, d = this._elem.hierarchy.length;
                        for(C = 0; C < d; C += 1)this._elem.hierarchy[C].finalTransform.mProp.applyToMatrix(v);
                        return v.inversePoint(u);
                    }
                    return v.inversePoint(u);
                }
                function c() {
                    return [
                        1,
                        1,
                        1,
                        1
                    ];
                }
                return function(u) {
                    var v;
                    function C(g) {
                        S.mask = new MaskManagerInterface(g, u);
                    }
                    function d(g) {
                        S.effect = g;
                    }
                    function S(g) {
                        switch(g){
                            case "ADBE Root Vectors Group":
                            case "Contents":
                            case 2:
                                return S.shapeInterface;
                            case 1:
                            case 6:
                            case "Transform":
                            case "transform":
                            case "ADBE Transform Group":
                                return v;
                            case 4:
                            case "ADBE Effect Parade":
                            case "effects":
                            case "Effects":
                                return S.effect;
                            case "ADBE Text Properties":
                                return S.textInterface;
                            default:
                                return null;
                        }
                    }
                    S.getMatrix = e, S.invertPoint = o, S.applyPoint = a, S.toWorld = r, S.toWorldVec = t, S.fromWorld = s, S.fromWorldVec = i, S.toComp = r, S.fromComp = h, S.sampleImage = c, S.sourceRectAtTime = u.sourceRectAtTime.bind(u), S._elem = u, v = TransformExpressionInterface(u.finalTransform.mProp);
                    var _ = getDescriptor(v, "anchorPoint");
                    return Object.defineProperties(S, {
                        hasParent: {
                            get: function() {
                                return u.hierarchy.length;
                            }
                        },
                        parent: {
                            get: function() {
                                return u.hierarchy[0].layerInterface;
                            }
                        },
                        rotation: getDescriptor(v, "rotation"),
                        scale: getDescriptor(v, "scale"),
                        position: getDescriptor(v, "position"),
                        opacity: getDescriptor(v, "opacity"),
                        anchorPoint: _,
                        anchor_point: _,
                        transform: {
                            get: function() {
                                return v;
                            }
                        },
                        active: {
                            get: function() {
                                return u.isInRange;
                            }
                        }
                    }), S.startTime = u.data.st, S.index = u.data.ind, S.source = u.data.refId, S.height = u.data.ty === 0 ? u.data.h : 100, S.width = u.data.ty === 0 ? u.data.w : 100, S.inPoint = u.data.ip / u.comp.globalData.frameRate, S.outPoint = u.data.op / u.comp.globalData.frameRate, S._name = u.data.nm, S.registerMaskInterface = C, S.registerEffectsInterface = d, S;
                };
            }(), propertyGroupFactory = function() {
                return function(e, t) {
                    return function(r) {
                        return r = r === void 0 ? 1 : r, r <= 0 ? e : t(r - 1);
                    };
                };
            }(), PropertyInterface = function() {
                return function(e, t) {
                    var r = {
                        _name: e
                    };
                    function i(s) {
                        return s = s === void 0 ? 1 : s, s <= 0 ? r : t(s - 1);
                    }
                    return i;
                };
            }(), EffectsExpressionInterface = function() {
                var e = {
                    createEffectsInterface: t
                };
                function t(s, a) {
                    if (s.effectsManager) {
                        var o = [], h = s.data.ef, c, u = s.effectsManager.effectElements.length;
                        for(c = 0; c < u; c += 1)o.push(r(h[c], s.effectsManager.effectElements[c], a, s));
                        var v = s.data.ef || [], C = function(S) {
                            for(c = 0, u = v.length; c < u;){
                                if (S === v[c].nm || S === v[c].mn || S === v[c].ix) return o[c];
                                c += 1;
                            }
                            return null;
                        };
                        return Object.defineProperty(C, "numProperties", {
                            get: function() {
                                return v.length;
                            }
                        }), C;
                    }
                    return null;
                }
                function r(s, a, o, h) {
                    function c(S) {
                        for(var _ = s.ef, g = 0, T = _.length; g < T;){
                            if (S === _[g].nm || S === _[g].mn || S === _[g].ix) return _[g].ty === 5 ? v[g] : v[g]();
                            g += 1;
                        }
                        throw new Error;
                    }
                    var u = propertyGroupFactory(c, o), v = [], C, d = s.ef.length;
                    for(C = 0; C < d; C += 1)s.ef[C].ty === 5 ? v.push(r(s.ef[C], a.effectElements[C], a.effectElements[C].propertyGroup, h)) : v.push(i(a.effectElements[C], s.ef[C].ty, h, u));
                    return s.mn === "ADBE Color Control" && Object.defineProperty(c, "color", {
                        get: function() {
                            return v[0]();
                        }
                    }), Object.defineProperties(c, {
                        numProperties: {
                            get: function() {
                                return s.np;
                            }
                        },
                        _name: {
                            value: s.nm
                        },
                        propertyGroup: {
                            value: u
                        }
                    }), c.enabled = s.en !== 0, c.active = c.enabled, c;
                }
                function i(s, a, o, h) {
                    var c = ExpressionPropertyInterface(s.p);
                    function u() {
                        return a === 10 ? o.comp.compInterface(s.p.v) : c();
                    }
                    return s.p.setGroupProperty && s.p.setGroupProperty(PropertyInterface("", h)), u;
                }
                return e;
            }(), ShapePathInterface = function() {
                return function(t, r, i) {
                    var s = r.sh;
                    function a(h) {
                        return h === "Shape" || h === "shape" || h === "Path" || h === "path" || h === "ADBE Vector Shape" || h === 2 ? a.path : null;
                    }
                    var o = propertyGroupFactory(a, i);
                    return s.setGroupProperty(PropertyInterface("Path", o)), Object.defineProperties(a, {
                        path: {
                            get: function() {
                                return s.k && s.getValue(), s;
                            }
                        },
                        shape: {
                            get: function() {
                                return s.k && s.getValue(), s;
                            }
                        },
                        _name: {
                            value: t.nm
                        },
                        ix: {
                            value: t.ix
                        },
                        propertyIndex: {
                            value: t.ix
                        },
                        mn: {
                            value: t.mn
                        },
                        propertyGroup: {
                            value: i
                        }
                    }), a;
                };
            }(), ShapeExpressionInterface = function() {
                function e(_, g, T) {
                    var x = [], E, y = _ ? _.length : 0;
                    for(E = 0; E < y; E += 1)_[E].ty === "gr" ? x.push(r(_[E], g[E], T)) : _[E].ty === "fl" ? x.push(i(_[E], g[E], T)) : _[E].ty === "st" ? x.push(o(_[E], g[E], T)) : _[E].ty === "tm" ? x.push(h(_[E], g[E], T)) : _[E].ty === "tr" || (_[E].ty === "el" ? x.push(u(_[E], g[E], T)) : _[E].ty === "sr" ? x.push(v(_[E], g[E], T)) : _[E].ty === "sh" ? x.push(ShapePathInterface(_[E], g[E], T)) : _[E].ty === "rc" ? x.push(C(_[E], g[E], T)) : _[E].ty === "rd" ? x.push(d(_[E], g[E], T)) : _[E].ty === "rp" ? x.push(S(_[E], g[E], T)) : _[E].ty === "gf" ? x.push(s(_[E], g[E], T)) : x.push(a(_[E], g[E])));
                    return x;
                }
                function t(_, g, T) {
                    var x, E = function(w) {
                        for(var j = 0, M = x.length; j < M;){
                            if (x[j]._name === w || x[j].mn === w || x[j].propertyIndex === w || x[j].ix === w || x[j].ind === w) return x[j];
                            j += 1;
                        }
                        return typeof w == "number" ? x[w - 1] : null;
                    };
                    E.propertyGroup = propertyGroupFactory(E, T), x = e(_.it, g.it, E.propertyGroup), E.numProperties = x.length;
                    var y = c(_.it[_.it.length - 1], g.it[g.it.length - 1], E.propertyGroup);
                    return E.transform = y, E.propertyIndex = _.cix, E._name = _.nm, E;
                }
                function r(_, g, T) {
                    var x = function(w) {
                        switch(w){
                            case "ADBE Vectors Group":
                            case "Contents":
                            case 2:
                                return x.content;
                            default:
                                return x.transform;
                        }
                    };
                    x.propertyGroup = propertyGroupFactory(x, T);
                    var E = t(_, g, x.propertyGroup), y = c(_.it[_.it.length - 1], g.it[g.it.length - 1], x.propertyGroup);
                    return x.content = E, x.transform = y, Object.defineProperty(x, "_name", {
                        get: function() {
                            return _.nm;
                        }
                    }), x.numProperties = _.np, x.propertyIndex = _.ix, x.nm = _.nm, x.mn = _.mn, x;
                }
                function i(_, g, T) {
                    function x(E) {
                        return E === "Color" || E === "color" ? x.color : E === "Opacity" || E === "opacity" ? x.opacity : null;
                    }
                    return Object.defineProperties(x, {
                        color: {
                            get: ExpressionPropertyInterface(g.c)
                        },
                        opacity: {
                            get: ExpressionPropertyInterface(g.o)
                        },
                        _name: {
                            value: _.nm
                        },
                        mn: {
                            value: _.mn
                        }
                    }), g.c.setGroupProperty(PropertyInterface("Color", T)), g.o.setGroupProperty(PropertyInterface("Opacity", T)), x;
                }
                function s(_, g, T) {
                    function x(E) {
                        return E === "Start Point" || E === "start point" ? x.startPoint : E === "End Point" || E === "end point" ? x.endPoint : E === "Opacity" || E === "opacity" ? x.opacity : null;
                    }
                    return Object.defineProperties(x, {
                        startPoint: {
                            get: ExpressionPropertyInterface(g.s)
                        },
                        endPoint: {
                            get: ExpressionPropertyInterface(g.e)
                        },
                        opacity: {
                            get: ExpressionPropertyInterface(g.o)
                        },
                        type: {
                            get: function() {
                                return "a";
                            }
                        },
                        _name: {
                            value: _.nm
                        },
                        mn: {
                            value: _.mn
                        }
                    }), g.s.setGroupProperty(PropertyInterface("Start Point", T)), g.e.setGroupProperty(PropertyInterface("End Point", T)), g.o.setGroupProperty(PropertyInterface("Opacity", T)), x;
                }
                function a() {
                    function _() {
                        return null;
                    }
                    return _;
                }
                function o(_, g, T) {
                    var x = propertyGroupFactory(M, T), E = propertyGroupFactory(j, x);
                    function y(I) {
                        Object.defineProperty(j, _.d[I].nm, {
                            get: ExpressionPropertyInterface(g.d.dataProps[I].p)
                        });
                    }
                    var b, w = _.d ? _.d.length : 0, j = {};
                    for(b = 0; b < w; b += 1)y(b), g.d.dataProps[b].p.setGroupProperty(E);
                    function M(I) {
                        return I === "Color" || I === "color" ? M.color : I === "Opacity" || I === "opacity" ? M.opacity : I === "Stroke Width" || I === "stroke width" ? M.strokeWidth : null;
                    }
                    return Object.defineProperties(M, {
                        color: {
                            get: ExpressionPropertyInterface(g.c)
                        },
                        opacity: {
                            get: ExpressionPropertyInterface(g.o)
                        },
                        strokeWidth: {
                            get: ExpressionPropertyInterface(g.w)
                        },
                        dash: {
                            get: function() {
                                return j;
                            }
                        },
                        _name: {
                            value: _.nm
                        },
                        mn: {
                            value: _.mn
                        }
                    }), g.c.setGroupProperty(PropertyInterface("Color", x)), g.o.setGroupProperty(PropertyInterface("Opacity", x)), g.w.setGroupProperty(PropertyInterface("Stroke Width", x)), M;
                }
                function h(_, g, T) {
                    function x(y) {
                        return y === _.e.ix || y === "End" || y === "end" ? x.end : y === _.s.ix ? x.start : y === _.o.ix ? x.offset : null;
                    }
                    var E = propertyGroupFactory(x, T);
                    return x.propertyIndex = _.ix, g.s.setGroupProperty(PropertyInterface("Start", E)), g.e.setGroupProperty(PropertyInterface("End", E)), g.o.setGroupProperty(PropertyInterface("Offset", E)), x.propertyIndex = _.ix, x.propertyGroup = T, Object.defineProperties(x, {
                        start: {
                            get: ExpressionPropertyInterface(g.s)
                        },
                        end: {
                            get: ExpressionPropertyInterface(g.e)
                        },
                        offset: {
                            get: ExpressionPropertyInterface(g.o)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                function c(_, g, T) {
                    function x(y) {
                        return _.a.ix === y || y === "Anchor Point" ? x.anchorPoint : _.o.ix === y || y === "Opacity" ? x.opacity : _.p.ix === y || y === "Position" ? x.position : _.r.ix === y || y === "Rotation" || y === "ADBE Vector Rotation" ? x.rotation : _.s.ix === y || y === "Scale" ? x.scale : _.sk && _.sk.ix === y || y === "Skew" ? x.skew : _.sa && _.sa.ix === y || y === "Skew Axis" ? x.skewAxis : null;
                    }
                    var E = propertyGroupFactory(x, T);
                    return g.transform.mProps.o.setGroupProperty(PropertyInterface("Opacity", E)), g.transform.mProps.p.setGroupProperty(PropertyInterface("Position", E)), g.transform.mProps.a.setGroupProperty(PropertyInterface("Anchor Point", E)), g.transform.mProps.s.setGroupProperty(PropertyInterface("Scale", E)), g.transform.mProps.r.setGroupProperty(PropertyInterface("Rotation", E)), g.transform.mProps.sk && (g.transform.mProps.sk.setGroupProperty(PropertyInterface("Skew", E)), g.transform.mProps.sa.setGroupProperty(PropertyInterface("Skew Angle", E))), g.transform.op.setGroupProperty(PropertyInterface("Opacity", E)), Object.defineProperties(x, {
                        opacity: {
                            get: ExpressionPropertyInterface(g.transform.mProps.o)
                        },
                        position: {
                            get: ExpressionPropertyInterface(g.transform.mProps.p)
                        },
                        anchorPoint: {
                            get: ExpressionPropertyInterface(g.transform.mProps.a)
                        },
                        scale: {
                            get: ExpressionPropertyInterface(g.transform.mProps.s)
                        },
                        rotation: {
                            get: ExpressionPropertyInterface(g.transform.mProps.r)
                        },
                        skew: {
                            get: ExpressionPropertyInterface(g.transform.mProps.sk)
                        },
                        skewAxis: {
                            get: ExpressionPropertyInterface(g.transform.mProps.sa)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.ty = "tr", x.mn = _.mn, x.propertyGroup = T, x;
                }
                function u(_, g, T) {
                    function x(b) {
                        return _.p.ix === b ? x.position : _.s.ix === b ? x.size : null;
                    }
                    var E = propertyGroupFactory(x, T);
                    x.propertyIndex = _.ix;
                    var y = g.sh.ty === "tm" ? g.sh.prop : g.sh;
                    return y.s.setGroupProperty(PropertyInterface("Size", E)), y.p.setGroupProperty(PropertyInterface("Position", E)), Object.defineProperties(x, {
                        size: {
                            get: ExpressionPropertyInterface(y.s)
                        },
                        position: {
                            get: ExpressionPropertyInterface(y.p)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                function v(_, g, T) {
                    function x(b) {
                        return _.p.ix === b ? x.position : _.r.ix === b ? x.rotation : _.pt.ix === b ? x.points : _.or.ix === b || b === "ADBE Vector Star Outer Radius" ? x.outerRadius : _.os.ix === b ? x.outerRoundness : _.ir && (_.ir.ix === b || b === "ADBE Vector Star Inner Radius") ? x.innerRadius : _.is && _.is.ix === b ? x.innerRoundness : null;
                    }
                    var E = propertyGroupFactory(x, T), y = g.sh.ty === "tm" ? g.sh.prop : g.sh;
                    return x.propertyIndex = _.ix, y.or.setGroupProperty(PropertyInterface("Outer Radius", E)), y.os.setGroupProperty(PropertyInterface("Outer Roundness", E)), y.pt.setGroupProperty(PropertyInterface("Points", E)), y.p.setGroupProperty(PropertyInterface("Position", E)), y.r.setGroupProperty(PropertyInterface("Rotation", E)), _.ir && (y.ir.setGroupProperty(PropertyInterface("Inner Radius", E)), y.is.setGroupProperty(PropertyInterface("Inner Roundness", E))), Object.defineProperties(x, {
                        position: {
                            get: ExpressionPropertyInterface(y.p)
                        },
                        rotation: {
                            get: ExpressionPropertyInterface(y.r)
                        },
                        points: {
                            get: ExpressionPropertyInterface(y.pt)
                        },
                        outerRadius: {
                            get: ExpressionPropertyInterface(y.or)
                        },
                        outerRoundness: {
                            get: ExpressionPropertyInterface(y.os)
                        },
                        innerRadius: {
                            get: ExpressionPropertyInterface(y.ir)
                        },
                        innerRoundness: {
                            get: ExpressionPropertyInterface(y.is)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                function C(_, g, T) {
                    function x(b) {
                        return _.p.ix === b ? x.position : _.r.ix === b ? x.roundness : _.s.ix === b || b === "Size" || b === "ADBE Vector Rect Size" ? x.size : null;
                    }
                    var E = propertyGroupFactory(x, T), y = g.sh.ty === "tm" ? g.sh.prop : g.sh;
                    return x.propertyIndex = _.ix, y.p.setGroupProperty(PropertyInterface("Position", E)), y.s.setGroupProperty(PropertyInterface("Size", E)), y.r.setGroupProperty(PropertyInterface("Rotation", E)), Object.defineProperties(x, {
                        position: {
                            get: ExpressionPropertyInterface(y.p)
                        },
                        roundness: {
                            get: ExpressionPropertyInterface(y.r)
                        },
                        size: {
                            get: ExpressionPropertyInterface(y.s)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                function d(_, g, T) {
                    function x(b) {
                        return _.r.ix === b || b === "Round Corners 1" ? x.radius : null;
                    }
                    var E = propertyGroupFactory(x, T), y = g;
                    return x.propertyIndex = _.ix, y.rd.setGroupProperty(PropertyInterface("Radius", E)), Object.defineProperties(x, {
                        radius: {
                            get: ExpressionPropertyInterface(y.rd)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                function S(_, g, T) {
                    function x(b) {
                        return _.c.ix === b || b === "Copies" ? x.copies : _.o.ix === b || b === "Offset" ? x.offset : null;
                    }
                    var E = propertyGroupFactory(x, T), y = g;
                    return x.propertyIndex = _.ix, y.c.setGroupProperty(PropertyInterface("Copies", E)), y.o.setGroupProperty(PropertyInterface("Offset", E)), Object.defineProperties(x, {
                        copies: {
                            get: ExpressionPropertyInterface(y.c)
                        },
                        offset: {
                            get: ExpressionPropertyInterface(y.o)
                        },
                        _name: {
                            value: _.nm
                        }
                    }), x.mn = _.mn, x;
                }
                return function(_, g, T) {
                    var x;
                    function E(b) {
                        if (typeof b == "number") return b = b === void 0 ? 1 : b, b === 0 ? T : x[b - 1];
                        for(var w = 0, j = x.length; w < j;){
                            if (x[w]._name === b) return x[w];
                            w += 1;
                        }
                        return null;
                    }
                    function y() {
                        return T;
                    }
                    return E.propertyGroup = propertyGroupFactory(E, y), x = e(_, g, E.propertyGroup), E.numProperties = x.length, E._name = "Contents", E;
                };
            }(), TextExpressionInterface = function() {
                return function(e) {
                    var t;
                    function r(i) {
                        switch(i){
                            case "ADBE Text Document":
                                return r.sourceText;
                            default:
                                return null;
                        }
                    }
                    return Object.defineProperty(r, "sourceText", {
                        get: function() {
                            e.textProperty.getValue();
                            var s = e.textProperty.currentData.t;
                            return (!t || s !== t.value) && (t = new String(s), t.value = s || new String(s), Object.defineProperty(t, "style", {
                                get: function() {
                                    return {
                                        fillColor: e.textProperty.currentData.fc
                                    };
                                }
                            })), t;
                        }
                    }), r;
                };
            }();
            function _typeof(e) {
                "@babel/helpers - typeof";
                return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
                    return typeof t;
                } : function(t) {
                    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
                }, _typeof(e);
            }
            var FootageInterface = function() {
                var e = function(i) {
                    var s = "", a = i.getFootageData();
                    function o() {
                        return s = "", a = i.getFootageData(), h;
                    }
                    function h(c) {
                        if (a[c]) return s = c, a = a[c], _typeof(a) === "object" ? h : a;
                        var u = c.indexOf(s);
                        if (u !== -1) {
                            var v = parseInt(c.substr(u + s.length), 10);
                            return a = a[v], _typeof(a) === "object" ? h : a;
                        }
                        return "";
                    }
                    return o;
                }, t = function(i) {
                    function s(a) {
                        return a === "Outline" ? s.outlineInterface() : null;
                    }
                    return s._name = "Outline", s.outlineInterface = e(i), s;
                };
                return function(r) {
                    function i(s) {
                        return s === "Data" ? i.dataInterface : null;
                    }
                    return i._name = "Data", i.dataInterface = t(r), i;
                };
            }(), interfaces = {
                layer: LayerExpressionInterface,
                effects: EffectsExpressionInterface,
                comp: CompExpressionInterface,
                shape: ShapeExpressionInterface,
                text: TextExpressionInterface,
                footage: FootageInterface
            };
            function getInterface(e) {
                return interfaces[e] || null;
            }
            var expressionHelpers = function() {
                function e(o, h, c) {
                    h.x && (c.k = !0, c.x = !0, c.initiateExpression = ExpressionManager.initiateExpression, c.effectsSequence.push(c.initiateExpression(o, h, c).bind(c)));
                }
                function t(o) {
                    return o *= this.elem.globalData.frameRate, o -= this.offsetTime, o !== this._cachingAtTime.lastFrame && (this._cachingAtTime.lastIndex = this._cachingAtTime.lastFrame < o ? this._cachingAtTime.lastIndex : 0, this._cachingAtTime.value = this.interpolateValue(o, this._cachingAtTime), this._cachingAtTime.lastFrame = o), this._cachingAtTime.value;
                }
                function r(o) {
                    var h = -.01, c = this.getValueAtTime(o), u = this.getValueAtTime(o + h), v = 0;
                    if (c.length) {
                        var C;
                        for(C = 0; C < c.length; C += 1)v += Math.pow(u[C] - c[C], 2);
                        v = Math.sqrt(v) * 100;
                    } else v = 0;
                    return v;
                }
                function i(o) {
                    if (this.vel !== void 0) return this.vel;
                    var h = -.001, c = this.getValueAtTime(o), u = this.getValueAtTime(o + h), v;
                    if (c.length) {
                        v = createTypedArray("float32", c.length);
                        var C;
                        for(C = 0; C < c.length; C += 1)v[C] = (u[C] - c[C]) / h;
                    } else v = (u - c) / h;
                    return v;
                }
                function s() {
                    return this.pv;
                }
                function a(o) {
                    this.propertyGroup = o;
                }
                return {
                    searchExpressions: e,
                    getSpeedAtTime: r,
                    getVelocityAtTime: i,
                    getValueAtTime: t,
                    getStaticValueAtTime: s,
                    setGroupProperty: a
                };
            }();
            function addPropertyDecorator() {
                function e(d, S, _) {
                    if (!this.k || !this.keyframes) return this.pv;
                    d = d ? d.toLowerCase() : "";
                    var g = this.comp.renderedFrame, T = this.keyframes, x = T[T.length - 1].t;
                    if (g <= x) return this.pv;
                    var E, y;
                    _ ? (S ? E = Math.abs(x - this.elem.comp.globalData.frameRate * S) : E = Math.max(0, x - this.elem.data.ip), y = x - E) : ((!S || S > T.length - 1) && (S = T.length - 1), y = T[T.length - 1 - S].t, E = x - y);
                    var b, w, j;
                    if (d === "pingpong") {
                        var M = Math.floor((g - y) / E);
                        if (M % 2 !== 0) return this.getValueAtTime((E - (g - y) % E + y) / this.comp.globalData.frameRate, 0);
                    } else if (d === "offset") {
                        var I = this.getValueAtTime(y / this.comp.globalData.frameRate, 0), D = this.getValueAtTime(x / this.comp.globalData.frameRate, 0), B = this.getValueAtTime(((g - y) % E + y) / this.comp.globalData.frameRate, 0), G = Math.floor((g - y) / E);
                        if (this.pv.length) {
                            for(j = new Array(I.length), w = j.length, b = 0; b < w; b += 1)j[b] = (D[b] - I[b]) * G + B[b];
                            return j;
                        }
                        return (D - I) * G + B;
                    } else if (d === "continue") {
                        var V = this.getValueAtTime(x / this.comp.globalData.frameRate, 0), U = this.getValueAtTime((x - .001) / this.comp.globalData.frameRate, 0);
                        if (this.pv.length) {
                            for(j = new Array(V.length), w = j.length, b = 0; b < w; b += 1)j[b] = V[b] + (V[b] - U[b]) * ((g - x) / this.comp.globalData.frameRate) / 5e-4;
                            return j;
                        }
                        return V + (V - U) * ((g - x) / .001);
                    }
                    return this.getValueAtTime(((g - y) % E + y) / this.comp.globalData.frameRate, 0);
                }
                function t(d, S, _) {
                    if (!this.k) return this.pv;
                    d = d ? d.toLowerCase() : "";
                    var g = this.comp.renderedFrame, T = this.keyframes, x = T[0].t;
                    if (g >= x) return this.pv;
                    var E, y;
                    _ ? (S ? E = Math.abs(this.elem.comp.globalData.frameRate * S) : E = Math.max(0, this.elem.data.op - x), y = x + E) : ((!S || S > T.length - 1) && (S = T.length - 1), y = T[S].t, E = y - x);
                    var b, w, j;
                    if (d === "pingpong") {
                        var M = Math.floor((x - g) / E);
                        if (M % 2 === 0) return this.getValueAtTime(((x - g) % E + x) / this.comp.globalData.frameRate, 0);
                    } else if (d === "offset") {
                        var I = this.getValueAtTime(x / this.comp.globalData.frameRate, 0), D = this.getValueAtTime(y / this.comp.globalData.frameRate, 0), B = this.getValueAtTime((E - (x - g) % E + x) / this.comp.globalData.frameRate, 0), G = Math.floor((x - g) / E) + 1;
                        if (this.pv.length) {
                            for(j = new Array(I.length), w = j.length, b = 0; b < w; b += 1)j[b] = B[b] - (D[b] - I[b]) * G;
                            return j;
                        }
                        return B - (D - I) * G;
                    } else if (d === "continue") {
                        var V = this.getValueAtTime(x / this.comp.globalData.frameRate, 0), U = this.getValueAtTime((x + .001) / this.comp.globalData.frameRate, 0);
                        if (this.pv.length) {
                            for(j = new Array(V.length), w = j.length, b = 0; b < w; b += 1)j[b] = V[b] + (V[b] - U[b]) * (x - g) / .001;
                            return j;
                        }
                        return V + (V - U) * (x - g) / .001;
                    }
                    return this.getValueAtTime((E - ((x - g) % E + x)) / this.comp.globalData.frameRate, 0);
                }
                function r(d, S) {
                    if (!this.k) return this.pv;
                    if (d = (d || .4) * .5, S = Math.floor(S || 5), S <= 1) return this.pv;
                    var _ = this.comp.renderedFrame / this.comp.globalData.frameRate, g = _ - d, T = _ + d, x = S > 1 ? (T - g) / (S - 1) : 1, E = 0, y = 0, b;
                    this.pv.length ? b = createTypedArray("float32", this.pv.length) : b = 0;
                    for(var w; E < S;){
                        if (w = this.getValueAtTime(g + E * x), this.pv.length) for(y = 0; y < this.pv.length; y += 1)b[y] += w[y];
                        else b += w;
                        E += 1;
                    }
                    if (this.pv.length) for(y = 0; y < this.pv.length; y += 1)b[y] /= S;
                    else b /= S;
                    return b;
                }
                function i(d) {
                    this._transformCachingAtTime || (this._transformCachingAtTime = {
                        v: new Matrix
                    });
                    var S = this._transformCachingAtTime.v;
                    if (S.cloneFromProps(this.pre.props), this.appliedTransformations < 1) {
                        var _ = this.a.getValueAtTime(d);
                        S.translate(-_[0] * this.a.mult, -_[1] * this.a.mult, _[2] * this.a.mult);
                    }
                    if (this.appliedTransformations < 2) {
                        var g = this.s.getValueAtTime(d);
                        S.scale(g[0] * this.s.mult, g[1] * this.s.mult, g[2] * this.s.mult);
                    }
                    if (this.sk && this.appliedTransformations < 3) {
                        var T = this.sk.getValueAtTime(d), x = this.sa.getValueAtTime(d);
                        S.skewFromAxis(-T * this.sk.mult, x * this.sa.mult);
                    }
                    if (this.r && this.appliedTransformations < 4) {
                        var E = this.r.getValueAtTime(d);
                        S.rotate(-E * this.r.mult);
                    } else if (!this.r && this.appliedTransformations < 4) {
                        var y = this.rz.getValueAtTime(d), b = this.ry.getValueAtTime(d), w = this.rx.getValueAtTime(d), j = this.or.getValueAtTime(d);
                        S.rotateZ(-y * this.rz.mult).rotateY(b * this.ry.mult).rotateX(w * this.rx.mult).rotateZ(-j[2] * this.or.mult).rotateY(j[1] * this.or.mult).rotateX(j[0] * this.or.mult);
                    }
                    if (this.data.p && this.data.p.s) {
                        var M = this.px.getValueAtTime(d), I = this.py.getValueAtTime(d);
                        if (this.data.p.z) {
                            var D = this.pz.getValueAtTime(d);
                            S.translate(M * this.px.mult, I * this.py.mult, -D * this.pz.mult);
                        } else S.translate(M * this.px.mult, I * this.py.mult, 0);
                    } else {
                        var B = this.p.getValueAtTime(d);
                        S.translate(B[0] * this.p.mult, B[1] * this.p.mult, -B[2] * this.p.mult);
                    }
                    return S;
                }
                function s() {
                    return this.v.clone(new Matrix);
                }
                var a = TransformPropertyFactory.getTransformProperty;
                TransformPropertyFactory.getTransformProperty = function(d, S, _) {
                    var g = a(d, S, _);
                    return g.dynamicProperties.length ? g.getValueAtTime = i.bind(g) : g.getValueAtTime = s.bind(g), g.setGroupProperty = expressionHelpers.setGroupProperty, g;
                };
                var o = PropertyFactory.getProp;
                PropertyFactory.getProp = function(d, S, _, g, T) {
                    var x = o(d, S, _, g, T);
                    x.kf ? x.getValueAtTime = expressionHelpers.getValueAtTime.bind(x) : x.getValueAtTime = expressionHelpers.getStaticValueAtTime.bind(x), x.setGroupProperty = expressionHelpers.setGroupProperty, x.loopOut = e, x.loopIn = t, x.smooth = r, x.getVelocityAtTime = expressionHelpers.getVelocityAtTime.bind(x), x.getSpeedAtTime = expressionHelpers.getSpeedAtTime.bind(x), x.numKeys = S.a === 1 ? S.k.length : 0, x.propertyIndex = S.ix;
                    var E = 0;
                    return _ !== 0 && (E = createTypedArray("float32", S.a === 1 ? S.k[0].s.length : S.k.length)), x._cachingAtTime = {
                        lastFrame: initialDefaultFrame,
                        lastIndex: 0,
                        value: E
                    }, expressionHelpers.searchExpressions(d, S, x), x.k && T.addDynamicProperty(x), x;
                };
                function h(d) {
                    return this._cachingAtTime || (this._cachingAtTime = {
                        shapeValue: shapePool.clone(this.pv),
                        lastIndex: 0,
                        lastTime: initialDefaultFrame
                    }), d *= this.elem.globalData.frameRate, d -= this.offsetTime, d !== this._cachingAtTime.lastTime && (this._cachingAtTime.lastIndex = this._cachingAtTime.lastTime < d ? this._caching.lastIndex : 0, this._cachingAtTime.lastTime = d, this.interpolateShape(d, this._cachingAtTime.shapeValue, this._cachingAtTime)), this._cachingAtTime.shapeValue;
                }
                var c = ShapePropertyFactory.getConstructorFunction(), u = ShapePropertyFactory.getKeyframedConstructorFunction();
                function v() {}
                v.prototype = {
                    vertices: function(S, _) {
                        this.k && this.getValue();
                        var g = this.v;
                        _ !== void 0 && (g = this.getValueAtTime(_, 0));
                        var T, x = g._length, E = g[S], y = g.v, b = createSizedArray(x);
                        for(T = 0; T < x; T += 1)S === "i" || S === "o" ? b[T] = [
                            E[T][0] - y[T][0],
                            E[T][1] - y[T][1]
                        ] : b[T] = [
                            E[T][0],
                            E[T][1]
                        ];
                        return b;
                    },
                    points: function(S) {
                        return this.vertices("v", S);
                    },
                    inTangents: function(S) {
                        return this.vertices("i", S);
                    },
                    outTangents: function(S) {
                        return this.vertices("o", S);
                    },
                    isClosed: function() {
                        return this.v.c;
                    },
                    pointOnPath: function(S, _) {
                        var g = this.v;
                        _ !== void 0 && (g = this.getValueAtTime(_, 0)), this._segmentsLength || (this._segmentsLength = bez.getSegmentsLength(g));
                        for(var T = this._segmentsLength, x = T.lengths, E = T.totalLength * S, y = 0, b = x.length, w = 0, j; y < b;){
                            if (w + x[y].addedLength > E) {
                                var M = y, I = g.c && y === b - 1 ? 0 : y + 1, D = (E - w) / x[y].addedLength;
                                j = bez.getPointInSegment(g.v[M], g.v[I], g.o[M], g.i[I], D, x[y]);
                                break;
                            } else w += x[y].addedLength;
                            y += 1;
                        }
                        return j || (j = g.c ? [
                            g.v[0][0],
                            g.v[0][1]
                        ] : [
                            g.v[g._length - 1][0],
                            g.v[g._length - 1][1]
                        ]), j;
                    },
                    vectorOnPath: function(S, _, g) {
                        S == 1 ? S = this.v.c : S == 0 && (S = .999);
                        var T = this.pointOnPath(S, _), x = this.pointOnPath(S + .001, _), E = x[0] - T[0], y = x[1] - T[1], b = Math.sqrt(Math.pow(E, 2) + Math.pow(y, 2));
                        if (b === 0) return [
                            0,
                            0
                        ];
                        var w = g === "tangent" ? [
                            E / b,
                            y / b
                        ] : [
                            -y / b,
                            E / b
                        ];
                        return w;
                    },
                    tangentOnPath: function(S, _) {
                        return this.vectorOnPath(S, _, "tangent");
                    },
                    normalOnPath: function(S, _) {
                        return this.vectorOnPath(S, _, "normal");
                    },
                    setGroupProperty: expressionHelpers.setGroupProperty,
                    getValueAtTime: expressionHelpers.getStaticValueAtTime
                }, extendPrototype([
                    v
                ], c), extendPrototype([
                    v
                ], u), u.prototype.getValueAtTime = h, u.prototype.initiateExpression = ExpressionManager.initiateExpression;
                var C = ShapePropertyFactory.getShapeProp;
                ShapePropertyFactory.getShapeProp = function(d, S, _, g, T) {
                    var x = C(d, S, _, g, T);
                    return x.propertyIndex = S.ix, x.lock = !1, _ === 3 ? expressionHelpers.searchExpressions(d, S.pt, x) : _ === 4 && expressionHelpers.searchExpressions(d, S.ks, x), x.k && d.addDynamicProperty(x), x;
                };
            }
            function initialize$1() {
                addPropertyDecorator();
            }
            function addDecorator() {
                function e() {
                    return this.data.d.x ? (this.calculateExpression = ExpressionManager.initiateExpression.bind(this)(this.elem, this.data.d, this), this.addEffect(this.getExpressionValue.bind(this)), !0) : null;
                }
                TextProperty.prototype.getExpressionValue = function(t, r) {
                    var i = this.calculateExpression(r);
                    if (t.t !== i) {
                        var s = {};
                        return this.copyData(s, t), s.t = i.toString(), s.__complete = !1, s;
                    }
                    return t;
                }, TextProperty.prototype.searchProperty = function() {
                    var t = this.searchKeyframes(), r = this.searchExpressions();
                    return this.kf = t || r, this.kf;
                }, TextProperty.prototype.searchExpressions = e;
            }
            function initialize() {
                addDecorator();
            }
            function SVGComposableEffect() {}
            SVGComposableEffect.prototype = {
                createMergeNode: function e(t, r) {
                    var i = createNS("feMerge");
                    i.setAttribute("result", t);
                    var s, a;
                    for(a = 0; a < r.length; a += 1)s = createNS("feMergeNode"), s.setAttribute("in", r[a]), i.appendChild(s), i.appendChild(s);
                    return i;
                }
            };
            var linearFilterValue = "0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0";
            function SVGTintFilter(e, t, r, i, s) {
                this.filterManager = t;
                var a = createNS("feColorMatrix");
                a.setAttribute("type", "matrix"), a.setAttribute("color-interpolation-filters", "linearRGB"), a.setAttribute("values", linearFilterValue + " 1 0"), this.linearFilter = a, a.setAttribute("result", i + "_tint_1"), e.appendChild(a), a = createNS("feColorMatrix"), a.setAttribute("type", "matrix"), a.setAttribute("color-interpolation-filters", "sRGB"), a.setAttribute("values", "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"), a.setAttribute("result", i + "_tint_2"), e.appendChild(a), this.matrixFilter = a;
                var o = this.createMergeNode(i, [
                    s,
                    i + "_tint_1",
                    i + "_tint_2"
                ]);
                e.appendChild(o);
            }
            extendPrototype([
                SVGComposableEffect
            ], SVGTintFilter), SVGTintFilter.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    var t = this.filterManager.effectElements[0].p.v, r = this.filterManager.effectElements[1].p.v, i = this.filterManager.effectElements[2].p.v / 100;
                    this.linearFilter.setAttribute("values", linearFilterValue + " " + i + " 0"), this.matrixFilter.setAttribute("values", r[0] - t[0] + " 0 0 0 " + t[0] + " " + (r[1] - t[1]) + " 0 0 0 " + t[1] + " " + (r[2] - t[2]) + " 0 0 0 " + t[2] + " 0 0 0 1 0");
                }
            };
            function SVGFillFilter(e, t, r, i) {
                this.filterManager = t;
                var s = createNS("feColorMatrix");
                s.setAttribute("type", "matrix"), s.setAttribute("color-interpolation-filters", "sRGB"), s.setAttribute("values", "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"), s.setAttribute("result", i), e.appendChild(s), this.matrixFilter = s;
            }
            SVGFillFilter.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    var t = this.filterManager.effectElements[2].p.v, r = this.filterManager.effectElements[6].p.v;
                    this.matrixFilter.setAttribute("values", "0 0 0 0 " + t[0] + " 0 0 0 0 " + t[1] + " 0 0 0 0 " + t[2] + " 0 0 0 " + r + " 0");
                }
            };
            function SVGStrokeEffect(e, t, r) {
                this.initialized = !1, this.filterManager = t, this.elem = r, this.paths = [];
            }
            SVGStrokeEffect.prototype.initialize = function() {
                var e = this.elem.layerElement.children || this.elem.layerElement.childNodes, t, r, i, s;
                for(this.filterManager.effectElements[1].p.v === 1 ? (s = this.elem.maskManager.masksProperties.length, i = 0) : (i = this.filterManager.effectElements[0].p.v - 1, s = i + 1), r = createNS("g"), r.setAttribute("fill", "none"), r.setAttribute("stroke-linecap", "round"), r.setAttribute("stroke-dashoffset", 1), i; i < s; i += 1)t = createNS("path"), r.appendChild(t), this.paths.push({
                    p: t,
                    m: i
                });
                if (this.filterManager.effectElements[10].p.v === 3) {
                    var a = createNS("mask"), o = createElementID();
                    a.setAttribute("id", o), a.setAttribute("mask-type", "alpha"), a.appendChild(r), this.elem.globalData.defs.appendChild(a);
                    var h = createNS("g");
                    for(h.setAttribute("mask", "url(" + getLocationHref() + "#" + o + ")"); e[0];)h.appendChild(e[0]);
                    this.elem.layerElement.appendChild(h), this.masker = a, r.setAttribute("stroke", "#fff");
                } else if (this.filterManager.effectElements[10].p.v === 1 || this.filterManager.effectElements[10].p.v === 2) {
                    if (this.filterManager.effectElements[10].p.v === 2) for(e = this.elem.layerElement.children || this.elem.layerElement.childNodes; e.length;)this.elem.layerElement.removeChild(e[0]);
                    this.elem.layerElement.appendChild(r), this.elem.layerElement.removeAttribute("mask"), r.setAttribute("stroke", "#fff");
                }
                this.initialized = !0, this.pathMasker = r;
            }, SVGStrokeEffect.prototype.renderFrame = function(e) {
                this.initialized || this.initialize();
                var t, r = this.paths.length, i, s;
                for(t = 0; t < r; t += 1)if (this.paths[t].m !== -1 && (i = this.elem.maskManager.viewData[this.paths[t].m], s = this.paths[t].p, (e || this.filterManager._mdf || i.prop._mdf) && s.setAttribute("d", i.lastPath), e || this.filterManager.effectElements[9].p._mdf || this.filterManager.effectElements[4].p._mdf || this.filterManager.effectElements[7].p._mdf || this.filterManager.effectElements[8].p._mdf || i.prop._mdf)) {
                    var a;
                    if (this.filterManager.effectElements[7].p.v !== 0 || this.filterManager.effectElements[8].p.v !== 100) {
                        var o = Math.min(this.filterManager.effectElements[7].p.v, this.filterManager.effectElements[8].p.v) * .01, h = Math.max(this.filterManager.effectElements[7].p.v, this.filterManager.effectElements[8].p.v) * .01, c = s.getTotalLength();
                        a = "0 0 0 " + c * o + " ";
                        var u = c * (h - o), v = 1 + this.filterManager.effectElements[4].p.v * 2 * this.filterManager.effectElements[9].p.v * .01, C = Math.floor(u / v), d;
                        for(d = 0; d < C; d += 1)a += "1 " + this.filterManager.effectElements[4].p.v * 2 * this.filterManager.effectElements[9].p.v * .01 + " ";
                        a += "0 " + c * 10 + " 0 0";
                    } else a = "1 " + this.filterManager.effectElements[4].p.v * 2 * this.filterManager.effectElements[9].p.v * .01;
                    s.setAttribute("stroke-dasharray", a);
                }
                if ((e || this.filterManager.effectElements[4].p._mdf) && this.pathMasker.setAttribute("stroke-width", this.filterManager.effectElements[4].p.v * 2), (e || this.filterManager.effectElements[6].p._mdf) && this.pathMasker.setAttribute("opacity", this.filterManager.effectElements[6].p.v), (this.filterManager.effectElements[10].p.v === 1 || this.filterManager.effectElements[10].p.v === 2) && (e || this.filterManager.effectElements[3].p._mdf)) {
                    var S = this.filterManager.effectElements[3].p.v;
                    this.pathMasker.setAttribute("stroke", "rgb(" + bmFloor(S[0] * 255) + "," + bmFloor(S[1] * 255) + "," + bmFloor(S[2] * 255) + ")");
                }
            };
            function SVGTritoneFilter(e, t, r, i) {
                this.filterManager = t;
                var s = createNS("feColorMatrix");
                s.setAttribute("type", "matrix"), s.setAttribute("color-interpolation-filters", "linearRGB"), s.setAttribute("values", "0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"), e.appendChild(s);
                var a = createNS("feComponentTransfer");
                a.setAttribute("color-interpolation-filters", "sRGB"), a.setAttribute("result", i), this.matrixFilter = a;
                var o = createNS("feFuncR");
                o.setAttribute("type", "table"), a.appendChild(o), this.feFuncR = o;
                var h = createNS("feFuncG");
                h.setAttribute("type", "table"), a.appendChild(h), this.feFuncG = h;
                var c = createNS("feFuncB");
                c.setAttribute("type", "table"), a.appendChild(c), this.feFuncB = c, e.appendChild(a);
            }
            SVGTritoneFilter.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    var t = this.filterManager.effectElements[0].p.v, r = this.filterManager.effectElements[1].p.v, i = this.filterManager.effectElements[2].p.v, s = i[0] + " " + r[0] + " " + t[0], a = i[1] + " " + r[1] + " " + t[1], o = i[2] + " " + r[2] + " " + t[2];
                    this.feFuncR.setAttribute("tableValues", s), this.feFuncG.setAttribute("tableValues", a), this.feFuncB.setAttribute("tableValues", o);
                }
            };
            function SVGProLevelsFilter(e, t, r, i) {
                this.filterManager = t;
                var s = this.filterManager.effectElements, a = createNS("feComponentTransfer");
                (s[10].p.k || s[10].p.v !== 0 || s[11].p.k || s[11].p.v !== 1 || s[12].p.k || s[12].p.v !== 1 || s[13].p.k || s[13].p.v !== 0 || s[14].p.k || s[14].p.v !== 1) && (this.feFuncR = this.createFeFunc("feFuncR", a)), (s[17].p.k || s[17].p.v !== 0 || s[18].p.k || s[18].p.v !== 1 || s[19].p.k || s[19].p.v !== 1 || s[20].p.k || s[20].p.v !== 0 || s[21].p.k || s[21].p.v !== 1) && (this.feFuncG = this.createFeFunc("feFuncG", a)), (s[24].p.k || s[24].p.v !== 0 || s[25].p.k || s[25].p.v !== 1 || s[26].p.k || s[26].p.v !== 1 || s[27].p.k || s[27].p.v !== 0 || s[28].p.k || s[28].p.v !== 1) && (this.feFuncB = this.createFeFunc("feFuncB", a)), (s[31].p.k || s[31].p.v !== 0 || s[32].p.k || s[32].p.v !== 1 || s[33].p.k || s[33].p.v !== 1 || s[34].p.k || s[34].p.v !== 0 || s[35].p.k || s[35].p.v !== 1) && (this.feFuncA = this.createFeFunc("feFuncA", a)), (this.feFuncR || this.feFuncG || this.feFuncB || this.feFuncA) && (a.setAttribute("color-interpolation-filters", "sRGB"), e.appendChild(a)), (s[3].p.k || s[3].p.v !== 0 || s[4].p.k || s[4].p.v !== 1 || s[5].p.k || s[5].p.v !== 1 || s[6].p.k || s[6].p.v !== 0 || s[7].p.k || s[7].p.v !== 1) && (a = createNS("feComponentTransfer"), a.setAttribute("color-interpolation-filters", "sRGB"), a.setAttribute("result", i), e.appendChild(a), this.feFuncRComposed = this.createFeFunc("feFuncR", a), this.feFuncGComposed = this.createFeFunc("feFuncG", a), this.feFuncBComposed = this.createFeFunc("feFuncB", a));
            }
            SVGProLevelsFilter.prototype.createFeFunc = function(e, t) {
                var r = createNS(e);
                return r.setAttribute("type", "table"), t.appendChild(r), r;
            }, SVGProLevelsFilter.prototype.getTableValue = function(e, t, r, i, s) {
                for(var a = 0, o = 256, h, c = Math.min(e, t), u = Math.max(e, t), v = Array.call(null, {
                    length: o
                }), C, d = 0, S = s - i, _ = t - e; a <= 256;)h = a / 256, h <= c ? C = _ < 0 ? s : i : h >= u ? C = _ < 0 ? i : s : C = i + S * Math.pow((h - e) / _, 1 / r), v[d] = C, d += 1, a += 256 / (o - 1);
                return v.join(" ");
            }, SVGProLevelsFilter.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    var t, r = this.filterManager.effectElements;
                    this.feFuncRComposed && (e || r[3].p._mdf || r[4].p._mdf || r[5].p._mdf || r[6].p._mdf || r[7].p._mdf) && (t = this.getTableValue(r[3].p.v, r[4].p.v, r[5].p.v, r[6].p.v, r[7].p.v), this.feFuncRComposed.setAttribute("tableValues", t), this.feFuncGComposed.setAttribute("tableValues", t), this.feFuncBComposed.setAttribute("tableValues", t)), this.feFuncR && (e || r[10].p._mdf || r[11].p._mdf || r[12].p._mdf || r[13].p._mdf || r[14].p._mdf) && (t = this.getTableValue(r[10].p.v, r[11].p.v, r[12].p.v, r[13].p.v, r[14].p.v), this.feFuncR.setAttribute("tableValues", t)), this.feFuncG && (e || r[17].p._mdf || r[18].p._mdf || r[19].p._mdf || r[20].p._mdf || r[21].p._mdf) && (t = this.getTableValue(r[17].p.v, r[18].p.v, r[19].p.v, r[20].p.v, r[21].p.v), this.feFuncG.setAttribute("tableValues", t)), this.feFuncB && (e || r[24].p._mdf || r[25].p._mdf || r[26].p._mdf || r[27].p._mdf || r[28].p._mdf) && (t = this.getTableValue(r[24].p.v, r[25].p.v, r[26].p.v, r[27].p.v, r[28].p.v), this.feFuncB.setAttribute("tableValues", t)), this.feFuncA && (e || r[31].p._mdf || r[32].p._mdf || r[33].p._mdf || r[34].p._mdf || r[35].p._mdf) && (t = this.getTableValue(r[31].p.v, r[32].p.v, r[33].p.v, r[34].p.v, r[35].p.v), this.feFuncA.setAttribute("tableValues", t));
                }
            };
            function SVGDropShadowEffect(e, t, r, i, s) {
                var a = t.container.globalData.renderConfig.filterSize, o = t.data.fs || a;
                e.setAttribute("x", o.x || a.x), e.setAttribute("y", o.y || a.y), e.setAttribute("width", o.width || a.width), e.setAttribute("height", o.height || a.height), this.filterManager = t;
                var h = createNS("feGaussianBlur");
                h.setAttribute("in", "SourceAlpha"), h.setAttribute("result", i + "_drop_shadow_1"), h.setAttribute("stdDeviation", "0"), this.feGaussianBlur = h, e.appendChild(h);
                var c = createNS("feOffset");
                c.setAttribute("dx", "25"), c.setAttribute("dy", "0"), c.setAttribute("in", i + "_drop_shadow_1"), c.setAttribute("result", i + "_drop_shadow_2"), this.feOffset = c, e.appendChild(c);
                var u = createNS("feFlood");
                u.setAttribute("flood-color", "#00ff00"), u.setAttribute("flood-opacity", "1"), u.setAttribute("result", i + "_drop_shadow_3"), this.feFlood = u, e.appendChild(u);
                var v = createNS("feComposite");
                v.setAttribute("in", i + "_drop_shadow_3"), v.setAttribute("in2", i + "_drop_shadow_2"), v.setAttribute("operator", "in"), v.setAttribute("result", i + "_drop_shadow_4"), e.appendChild(v);
                var C = this.createMergeNode(i, [
                    i + "_drop_shadow_4",
                    s
                ]);
                e.appendChild(C);
            }
            extendPrototype([
                SVGComposableEffect
            ], SVGDropShadowEffect), SVGDropShadowEffect.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    if ((e || this.filterManager.effectElements[4].p._mdf) && this.feGaussianBlur.setAttribute("stdDeviation", this.filterManager.effectElements[4].p.v / 4), e || this.filterManager.effectElements[0].p._mdf) {
                        var t = this.filterManager.effectElements[0].p.v;
                        this.feFlood.setAttribute("flood-color", rgbToHex(Math.round(t[0] * 255), Math.round(t[1] * 255), Math.round(t[2] * 255)));
                    }
                    if ((e || this.filterManager.effectElements[1].p._mdf) && this.feFlood.setAttribute("flood-opacity", this.filterManager.effectElements[1].p.v / 255), e || this.filterManager.effectElements[2].p._mdf || this.filterManager.effectElements[3].p._mdf) {
                        var r = this.filterManager.effectElements[3].p.v, i = (this.filterManager.effectElements[2].p.v - 90) * degToRads, s = r * Math.cos(i), a = r * Math.sin(i);
                        this.feOffset.setAttribute("dx", s), this.feOffset.setAttribute("dy", a);
                    }
                }
            };
            var _svgMatteSymbols = [];
            function SVGMatte3Effect(e, t, r) {
                this.initialized = !1, this.filterManager = t, this.filterElem = e, this.elem = r, r.matteElement = createNS("g"), r.matteElement.appendChild(r.layerElement), r.matteElement.appendChild(r.transformedElement), r.baseElement = r.matteElement;
            }
            SVGMatte3Effect.prototype.findSymbol = function(e) {
                for(var t = 0, r = _svgMatteSymbols.length; t < r;){
                    if (_svgMatteSymbols[t] === e) return _svgMatteSymbols[t];
                    t += 1;
                }
                return null;
            }, SVGMatte3Effect.prototype.replaceInParent = function(e, t) {
                var r = e.layerElement.parentNode;
                if (r) {
                    for(var i = r.children, s = 0, a = i.length; s < a && i[s] !== e.layerElement;)s += 1;
                    var o;
                    s <= a - 2 && (o = i[s + 1]);
                    var h = createNS("use");
                    h.setAttribute("href", "#" + t), o ? r.insertBefore(h, o) : r.appendChild(h);
                }
            }, SVGMatte3Effect.prototype.setElementAsMask = function(e, t) {
                if (!this.findSymbol(t)) {
                    var r = createElementID(), i = createNS("mask");
                    i.setAttribute("id", t.layerId), i.setAttribute("mask-type", "alpha"), _svgMatteSymbols.push(t);
                    var s = e.globalData.defs;
                    s.appendChild(i);
                    var a = createNS("symbol");
                    a.setAttribute("id", r), this.replaceInParent(t, r), a.appendChild(t.layerElement), s.appendChild(a);
                    var o = createNS("use");
                    o.setAttribute("href", "#" + r), i.appendChild(o), t.data.hd = !1, t.show();
                }
                e.setMatte(t.layerId);
            }, SVGMatte3Effect.prototype.initialize = function() {
                for(var e = this.filterManager.effectElements[0].p.v, t = this.elem.comp.elements, r = 0, i = t.length; r < i;)t[r] && t[r].data.ind === e && this.setElementAsMask(this.elem, t[r]), r += 1;
                this.initialized = !0;
            }, SVGMatte3Effect.prototype.renderFrame = function() {
                this.initialized || this.initialize();
            };
            function SVGGaussianBlurEffect(e, t, r, i) {
                e.setAttribute("x", "-100%"), e.setAttribute("y", "-100%"), e.setAttribute("width", "300%"), e.setAttribute("height", "300%"), this.filterManager = t;
                var s = createNS("feGaussianBlur");
                s.setAttribute("result", i), e.appendChild(s), this.feGaussianBlur = s;
            }
            SVGGaussianBlurEffect.prototype.renderFrame = function(e) {
                if (e || this.filterManager._mdf) {
                    var t = .3, r = this.filterManager.effectElements[0].p.v * t, i = this.filterManager.effectElements[1].p.v, s = i == 3 ? 0 : r, a = i == 2 ? 0 : r;
                    this.feGaussianBlur.setAttribute("stdDeviation", s + " " + a);
                    var o = this.filterManager.effectElements[2].p.v == 1 ? "wrap" : "duplicate";
                    this.feGaussianBlur.setAttribute("edgeMode", o);
                }
            };
            function TransformEffect() {}
            TransformEffect.prototype.init = function(e) {
                this.effectsManager = e, this.type = effectTypes.TRANSFORM_EFFECT, this.matrix = new Matrix, this.opacity = -1, this._mdf = !1, this._opMdf = !1;
            }, TransformEffect.prototype.renderFrame = function(e) {
                if (this._opMdf = !1, this._mdf = !1, e || this.effectsManager._mdf) {
                    var t = this.effectsManager.effectElements, r = t[0].p.v, i = t[1].p.v, s = t[2].p.v === 1, a = t[3].p.v, o = s ? a : t[4].p.v, h = t[5].p.v, c = t[6].p.v, u = t[7].p.v;
                    this.matrix.reset(), this.matrix.translate(-r[0], -r[1], r[2]), this.matrix.scale(o * .01, a * .01, 1), this.matrix.rotate(-u * degToRads), this.matrix.skewFromAxis(-h * degToRads, (c + 90) * degToRads), this.matrix.translate(i[0], i[1], 0), this._mdf = !0, this.opacity !== t[8].p.v && (this.opacity = t[8].p.v, this._opMdf = !0);
                }
            };
            function SVGTransformEffect(e, t) {
                this.init(t);
            }
            extendPrototype([
                TransformEffect
            ], SVGTransformEffect);
            function CVTransformEffect(e) {
                this.init(e);
            }
            return extendPrototype([
                TransformEffect
            ], CVTransformEffect), registerRenderer("canvas", CanvasRenderer), registerRenderer("html", HybridRenderer), registerRenderer("svg", SVGRenderer), ShapeModifiers.registerModifier("tm", TrimModifier), ShapeModifiers.registerModifier("pb", PuckerAndBloatModifier), ShapeModifiers.registerModifier("rp", RepeaterModifier), ShapeModifiers.registerModifier("rd", RoundCornersModifier), ShapeModifiers.registerModifier("zz", ZigZagModifier), ShapeModifiers.registerModifier("op", OffsetPathModifier), setExpressionsPlugin(Expressions), setExpressionInterfaces(getInterface), initialize$1(), initialize(), registerEffect$1(20, SVGTintFilter, !0), registerEffect$1(21, SVGFillFilter, !0), registerEffect$1(22, SVGStrokeEffect, !1), registerEffect$1(23, SVGTritoneFilter, !0), registerEffect$1(24, SVGProLevelsFilter, !0), registerEffect$1(25, SVGDropShadowEffect, !0), registerEffect$1(28, SVGMatte3Effect, !1), registerEffect$1(29, SVGGaussianBlurEffect, !0), registerEffect$1(35, SVGTransformEffect, !1), registerEffect(35, CVTransformEffect), lottie;
        });
    })(lottie$1, lottie$1.exports);
    var lottieExports = lottie$1.exports;
    const lottie = getDefaultExportFromCjs(lottieExports);
    function _arrayLikeToArray(e, t) {
        (t == null || t > e.length) && (t = e.length);
        for(var r = 0, i = Array(t); r < t; r++)i[r] = e[r];
        return i;
    }
    function _arrayWithHoles(e) {
        if (Array.isArray(e)) return e;
    }
    function _defineProperty(e, t, r) {
        return (t = _toPropertyKey(t)) in e ? Object.defineProperty(e, t, {
            value: r,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : e[t] = r, e;
    }
    function _iterableToArrayLimit(e, t) {
        var r = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
        if (r != null) {
            var i, s, a, o, h = [], c = !0, u = !1;
            try {
                if (a = (r = r.call(e)).next, t !== 0) for(; !(c = (i = a.call(r)).done) && (h.push(i.value), h.length !== t); c = !0);
            } catch (v) {
                u = !0, s = v;
            } finally{
                try {
                    if (!c && r.return != null && (o = r.return(), Object(o) !== o)) return;
                } finally{
                    if (u) throw s;
                }
            }
            return h;
        }
    }
    function _nonIterableRest() {
        throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function ownKeys(e, t) {
        var r = Object.keys(e);
        if (Object.getOwnPropertySymbols) {
            var i = Object.getOwnPropertySymbols(e);
            t && (i = i.filter(function(s) {
                return Object.getOwnPropertyDescriptor(e, s).enumerable;
            })), r.push.apply(r, i);
        }
        return r;
    }
    function _objectSpread2(e) {
        for(var t = 1; t < arguments.length; t++){
            var r = arguments[t] != null ? arguments[t] : {};
            t % 2 ? ownKeys(Object(r), !0).forEach(function(i) {
                _defineProperty(e, i, r[i]);
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : ownKeys(Object(r)).forEach(function(i) {
                Object.defineProperty(e, i, Object.getOwnPropertyDescriptor(r, i));
            });
        }
        return e;
    }
    function _objectWithoutProperties(e, t) {
        if (e == null) return {};
        var r, i, s = _objectWithoutPropertiesLoose(e, t);
        if (Object.getOwnPropertySymbols) {
            var a = Object.getOwnPropertySymbols(e);
            for(i = 0; i < a.length; i++)r = a[i], t.includes(r) || {}.propertyIsEnumerable.call(e, r) && (s[r] = e[r]);
        }
        return s;
    }
    function _objectWithoutPropertiesLoose(e, t) {
        if (e == null) return {};
        var r = {};
        for(var i in e)if ({}.hasOwnProperty.call(e, i)) {
            if (t.includes(i)) continue;
            r[i] = e[i];
        }
        return r;
    }
    function _slicedToArray(e, t) {
        return _arrayWithHoles(e) || _iterableToArrayLimit(e, t) || _unsupportedIterableToArray(e, t) || _nonIterableRest();
    }
    function _toPrimitive(e, t) {
        if (typeof e != "object" || !e) return e;
        var r = e[Symbol.toPrimitive];
        if (r !== void 0) {
            var i = r.call(e, t);
            if (typeof i != "object") return i;
            throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return (t === "string" ? String : Number)(e);
    }
    function _toPropertyKey(e) {
        var t = _toPrimitive(e, "string");
        return typeof t == "symbol" ? t : t + "";
    }
    function _unsupportedIterableToArray(e, t) {
        if (e) {
            if (typeof e == "string") return _arrayLikeToArray(e, t);
            var r = {}.toString.call(e).slice(8, -1);
            return r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set" ? Array.from(e) : r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? _arrayLikeToArray(e, t) : void 0;
        }
    }
    var _excluded$1 = [
        "animationData",
        "loop",
        "autoplay",
        "initialSegment",
        "onComplete",
        "onLoopComplete",
        "onEnterFrame",
        "onSegmentStart",
        "onConfigReady",
        "onDataReady",
        "onDataFailed",
        "onLoadedImages",
        "onDOMLoaded",
        "onDestroy",
        "lottieRef",
        "renderer",
        "name",
        "assetsPath",
        "rendererSettings"
    ], useLottie = function e(t, r) {
        var i = t.animationData, s = t.loop, a = t.autoplay, o = t.initialSegment, h = t.onComplete, c = t.onLoopComplete, u = t.onEnterFrame, v = t.onSegmentStart, C = t.onConfigReady, d = t.onDataReady, S = t.onDataFailed, _ = t.onLoadedImages, g = t.onDOMLoaded, T = t.onDestroy;
        t.lottieRef, t.renderer, t.name, t.assetsPath, t.rendererSettings;
        var x = _objectWithoutProperties(t, _excluded$1), E = reactExports.useState(!1), y = _slicedToArray(E, 2), b = y[0], w = y[1], j = reactExports.useRef(), M = reactExports.useRef(null), I = function() {
            var $;
            ($ = j.current) === null || $ === void 0 || $.play();
        }, D = function() {
            var $;
            ($ = j.current) === null || $ === void 0 || $.stop();
        }, B = function() {
            var $;
            ($ = j.current) === null || $ === void 0 || $.pause();
        }, G = function($) {
            var O;
            (O = j.current) === null || O === void 0 || O.setSpeed($);
        }, V = function($, O) {
            var H;
            (H = j.current) === null || H === void 0 || H.goToAndPlay($, O);
        }, U = function($, O) {
            var H;
            (H = j.current) === null || H === void 0 || H.goToAndStop($, O);
        }, W = function($) {
            var O;
            (O = j.current) === null || O === void 0 || O.setDirection($);
        }, z = function($, O) {
            var H;
            (H = j.current) === null || H === void 0 || H.playSegments($, O);
        }, A = function($) {
            var O;
            (O = j.current) === null || O === void 0 || O.setSubframe($);
        }, F = function($) {
            var O;
            return (O = j.current) === null || O === void 0 ? void 0 : O.getDuration($);
        }, P = function() {
            var $;
            ($ = j.current) === null || $ === void 0 || $.destroy(), j.current = void 0;
        }, R = function() {
            var $ = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, O;
            if (M.current) {
                (O = j.current) === null || O === void 0 || O.destroy();
                var H = _objectSpread2(_objectSpread2(_objectSpread2({}, t), $), {}, {
                    container: M.current
                });
                return j.current = lottie.loadAnimation(H), w(!!j.current), function() {
                    var Y;
                    (Y = j.current) === null || Y === void 0 || Y.destroy(), j.current = void 0;
                };
            }
        };
        reactExports.useEffect(function() {
            var N = R();
            return function() {
                return N?.();
            };
        }, [
            i,
            s
        ]), reactExports.useEffect(function() {
            j.current && (j.current.autoplay = !!a);
        }, [
            a
        ]), reactExports.useEffect(function() {
            if (j.current) {
                if (!o) {
                    j.current.resetSegments(!0);
                    return;
                }
                !Array.isArray(o) || !o.length || ((j.current.currentRawFrame < o[0] || j.current.currentRawFrame > o[1]) && (j.current.currentRawFrame = o[0]), j.current.setSegment(o[0], o[1]));
            }
        }, [
            o
        ]), reactExports.useEffect(function() {
            var N = [
                {
                    name: "complete",
                    handler: h
                },
                {
                    name: "loopComplete",
                    handler: c
                },
                {
                    name: "enterFrame",
                    handler: u
                },
                {
                    name: "segmentStart",
                    handler: v
                },
                {
                    name: "config_ready",
                    handler: C
                },
                {
                    name: "data_ready",
                    handler: d
                },
                {
                    name: "data_failed",
                    handler: S
                },
                {
                    name: "loaded_images",
                    handler: _
                },
                {
                    name: "DOMLoaded",
                    handler: g
                },
                {
                    name: "destroy",
                    handler: T
                }
            ], $ = N.filter(function(H) {
                return H.handler != null;
            });
            if ($.length) {
                var O = $.map(function(H) {
                    var Y;
                    return (Y = j.current) === null || Y === void 0 || Y.addEventListener(H.name, H.handler), function() {
                        var Z;
                        (Z = j.current) === null || Z === void 0 || Z.removeEventListener(H.name, H.handler);
                    };
                });
                return function() {
                    O.forEach(function(H) {
                        return H();
                    });
                };
            }
        }, [
            h,
            c,
            u,
            v,
            C,
            d,
            S,
            _,
            g,
            T
        ]);
        var L = React.createElement("div", _objectSpread2({
            style: r,
            ref: M
        }, x));
        return {
            View: L,
            play: I,
            stop: D,
            pause: B,
            setSpeed: G,
            goToAndStop: U,
            goToAndPlay: V,
            setDirection: W,
            playSegments: z,
            setSubframe: A,
            getDuration: F,
            destroy: P,
            animationContainerRef: M,
            animationLoaded: b,
            animationItem: j.current
        };
    };
    function getContainerVisibility(e) {
        var t = e.getBoundingClientRect(), r = t.top, i = t.height, s = window.innerHeight - r, a = window.innerHeight + i;
        return s / a;
    }
    function getContainerCursorPosition(e, t, r) {
        var i = e.getBoundingClientRect(), s = i.top, a = i.left, o = i.width, h = i.height, c = (t - a) / o, u = (r - s) / h;
        return {
            x: c,
            y: u
        };
    }
    var useInitInteractivity = function e(t) {
        var r = t.wrapperRef, i = t.animationItem, s = t.mode, a = t.actions;
        reactExports.useEffect(function() {
            var o = r.current;
            if (!(!o || !i || !a.length)) {
                i.stop();
                var h = function() {
                    var v = null, C = function() {
                        var S = getContainerVisibility(o), _ = a.find(function(T) {
                            var x = T.visibility;
                            return x && S >= x[0] && S <= x[1];
                        });
                        if (_) {
                            if (_.type === "seek" && _.visibility && _.frames.length === 2) {
                                var g = _.frames[0] + Math.ceil((S - _.visibility[0]) / (_.visibility[1] - _.visibility[0]) * _.frames[1]);
                                i.goToAndStop(g - i.firstFrame - 1, !0);
                            }
                            _.type === "loop" && (v === null || v !== _.frames || i.isPaused) && (i.playSegments(_.frames, !0), v = _.frames), _.type === "play" && i.isPaused && (i.resetSegments(!0), i.play()), _.type === "stop" && i.goToAndStop(_.frames[0] - i.firstFrame - 1, !0);
                        }
                    };
                    return document.addEventListener("scroll", C), function() {
                        document.removeEventListener("scroll", C);
                    };
                }, c = function() {
                    var v = function(_, g) {
                        var T = _, x = g;
                        if (T !== -1 && x !== -1) {
                            var E = getContainerCursorPosition(o, T, x);
                            T = E.x, x = E.y;
                        }
                        var y = a.find(function(j) {
                            var M = j.position;
                            return M && Array.isArray(M.x) && Array.isArray(M.y) ? T >= M.x[0] && T <= M.x[1] && x >= M.y[0] && x <= M.y[1] : M && !Number.isNaN(M.x) && !Number.isNaN(M.y) ? T === M.x && x === M.y : !1;
                        });
                        if (y) {
                            if (y.type === "seek" && y.position && Array.isArray(y.position.x) && Array.isArray(y.position.y) && y.frames.length === 2) {
                                var b = (T - y.position.x[0]) / (y.position.x[1] - y.position.x[0]), w = (x - y.position.y[0]) / (y.position.y[1] - y.position.y[0]);
                                i.playSegments(y.frames, !0), i.goToAndStop(Math.ceil((b + w) / 2 * (y.frames[1] - y.frames[0])), !0);
                            }
                            y.type === "loop" && i.playSegments(y.frames, !0), y.type === "play" && (i.isPaused && i.resetSegments(!1), i.playSegments(y.frames)), y.type === "stop" && i.goToAndStop(y.frames[0], !0);
                        }
                    }, C = function(_) {
                        v(_.clientX, _.clientY);
                    }, d = function() {
                        v(-1, -1);
                    };
                    return o.addEventListener("mousemove", C), o.addEventListener("mouseout", d), function() {
                        o.removeEventListener("mousemove", C), o.removeEventListener("mouseout", d);
                    };
                };
                switch(s){
                    case "scroll":
                        return h();
                    case "cursor":
                        return c();
                }
            }
        }, [
            s,
            i
        ]);
    }, useLottieInteractivity = function e(t) {
        var r = t.actions, i = t.mode, s = t.lottieObj, a = s.animationItem, o = s.View, h = s.animationContainerRef;
        return useInitInteractivity({
            actions: r,
            animationItem: a,
            mode: i,
            wrapperRef: h
        }), o;
    }, _excluded = [
        "style",
        "interactivity"
    ], Lottie = function e(t) {
        var r, i, s, a = t.style, o = t.interactivity, h = _objectWithoutProperties(t, _excluded), c = useLottie(h, a), u = c.View, v = c.play, C = c.stop, d = c.pause, S = c.setSpeed, _ = c.goToAndStop, g = c.goToAndPlay, T = c.setDirection, x = c.playSegments, E = c.setSubframe, y = c.getDuration, b = c.destroy, w = c.animationContainerRef, j = c.animationLoaded, M = c.animationItem;
        return reactExports.useEffect(function() {
            t.lottieRef && (t.lottieRef.current = {
                play: v,
                stop: C,
                pause: d,
                setSpeed: S,
                goToAndPlay: g,
                goToAndStop: _,
                setDirection: T,
                playSegments: x,
                setSubframe: E,
                getDuration: y,
                destroy: b,
                animationContainerRef: w,
                animationLoaded: j,
                animationItem: M
            });
        }, [
            (r = t.lottieRef) === null || r === void 0 ? void 0 : r.current
        ]), useLottieInteractivity({
            lottieObj: {
                View: u,
                play: v,
                stop: C,
                pause: d,
                setSpeed: S,
                goToAndStop: _,
                goToAndPlay: g,
                setDirection: T,
                playSegments: x,
                setSubframe: E,
                getDuration: y,
                destroy: b,
                animationContainerRef: w,
                animationLoaded: j,
                animationItem: M
            },
            actions: (i = o?.actions) !== null && i !== void 0 ? i : [],
            mode: (s = o?.mode) !== null && s !== void 0 ? s : "scroll"
        });
    };
    const LottieSticker = ({ url: e, width: t = 200, height: r = 200, loop: i = !0, className: s })=>{
        const [a, o] = reactExports.useState(null), [h, c] = reactExports.useState(!1), u = reactExports.useRef(null);
        return reactExports.useEffect(()=>{
            let v = !1;
            return (async ()=>{
                try {
                    const S = await (await fetch(e)).json();
                    v || o(S);
                } catch (d) {
                    console.error("Ошибка загрузки Lottie:", d);
                }
            })(), ()=>{
                v = !0;
            };
        }, [
            e
        ]), reactExports.useEffect(()=>{
            const v = u.current;
            if (!v) return;
            const C = new IntersectionObserver(([d])=>c(d.isIntersecting), {
                threshold: .3
            });
            return C.observe(v), ()=>C.disconnect();
        }, []), a ? jsxRuntimeExports.jsx("div", {
            ref: u,
            className: s,
            children: jsxRuntimeExports.jsx(Lottie, {
                animationData: a,
                loop: i,
                autoplay: h,
                style: {
                    width: t,
                    height: r
                }
            })
        }) : jsxRuntimeExports.jsx("div", {
            className: "lottie-sticker__placeholder",
            style: {
                width: t,
                height: r
            }
        });
    };
    function escapeHtml(e) {
        return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function renderMarkdown(e) {
        const t = [];
        let r = e.replace(/```(\w*)\n([\s\S]*?)```/g, (s, a, o)=>{
            const h = t.length;
            return t.push(`<pre class="md-code-block" data-lang="${escapeHtml(a)}"><code>${escapeHtml(o)}</code></pre>`), `\0CODEBLOCK_${h}\0`;
        });
        const i = [];
        return r = r.replace(/`([^`\n]+)`/g, (s, a)=>{
            const o = i.length;
            return i.push(`<code class="md-inline-code">${escapeHtml(a)}</code>`), `\0INLINE_${o}\0`;
        }), r = escapeHtml(r), r = r.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"), r = r.replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/g, "<em>$1</em>"), r = r.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>"), r = r.replace(/~~(.+?)~~/g, "<del>$1</del>"), r = r.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>'), r = r.replace(/(https?:\/\/[^\s<&]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'), r = r.replace(/\x00INLINE_(\d+)\x00/g, (s, a)=>i[Number(a)]), r = r.replace(/\x00CODEBLOCK_(\d+)\x00/g, (s, a)=>t[Number(a)]), r;
    }
    function formatTime$1(e) {
        return new Date(e).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }
    function formatFileSize(e) {
        return e < 1024 ? `${e} Б` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} КБ` : `${(e / (1024 * 1024)).toFixed(1)} МБ`;
    }
    const SENDER_COLORS = [
        "#f47067",
        "#c678dd",
        "#e5c07b",
        "#61afef",
        "#56b6c2",
        "#98c379",
        "#e06c75",
        "#d19a66"
    ];
    function getSenderColor(e) {
        let t = 0;
        for(let r = 0; r < e.length; r++)t = e.charCodeAt(r) + ((t << 5) - t);
        return SENDER_COLORS[Math.abs(t) % SENDER_COLORS.length];
    }
    function pluralReplies$1(e) {
        return e % 10 === 1 && e % 100 !== 11 ? "ответ" : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? "ответа" : "ответов";
    }
    const isTouchDevice = typeof window < "u" && ("ontouchstart" in window || navigator.maxTouchPoints > 0), QUICK_EMOJIS = [
        "👍",
        "❤️",
        "😂",
        "🎉",
        "👀",
        "🔥",
        "✅",
        "❌"
    ], MessageBubble = ({ message: e, showAuthor: t, reactions: r, isPinned: i, threadSummary: s, onReply: a, onReact: o, onRemoveReaction: h, onPin: c, onOpenThread: u, onScrollToMessage: v })=>{
        const [C, d] = reactExports.useState(!1), [S, _] = reactExports.useState(!1), g = reactExports.useRef(null), T = reactExports.useCallback(()=>{
            isTouchDevice && (g.current = setTimeout(()=>{
                _(!0), navigator.vibrate?.(30);
            }, 500));
        }, []), x = reactExports.useCallback(()=>{
            g.current && (clearTimeout(g.current), g.current = null);
        }, []), E = reactExports.useCallback(()=>{
            g.current && (clearTimeout(g.current), g.current = null);
        }, []), y = (w)=>{
            d(!1), o?.(e.id, w);
        }, b = (w)=>{
            w.myReactionEventId ? h?.(w.myReactionEventId) : o?.(e.id, w.emoji);
        };
        return jsxRuntimeExports.jsxs("div", {
            className: `message-bubble ${t ? "message-bubble--full" : ""} ${e.type === "sticker" ? "message-bubble--sticker" : ""}`,
            "data-event-id": e.id,
            onTouchStart: T,
            onTouchEnd: x,
            onTouchMove: E,
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "message-bubble__action-bar",
                    children: [
                        jsxRuntimeExports.jsx("button", {
                            className: "message-bubble__action-btn",
                            onClick: ()=>d(!C),
                            title: "Реакция",
                            children: jsxRuntimeExports.jsx(SmilePlus, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "message-bubble__action-btn",
                            onClick: ()=>a?.(e),
                            title: "Ответить",
                            children: jsxRuntimeExports.jsx(Reply, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "message-bubble__action-btn",
                            onClick: ()=>u?.(e.id),
                            title: "Тред",
                            children: jsxRuntimeExports.jsx(MessageSquare, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "message-bubble__action-btn",
                            onClick: ()=>c?.(e.id),
                            title: i ? "Открепить" : "Закрепить",
                            children: jsxRuntimeExports.jsx(Pin, {
                                size: 16
                            })
                        })
                    ]
                }),
                C && jsxRuntimeExports.jsx("div", {
                    className: "message-bubble__emoji-picker",
                    children: QUICK_EMOJIS.map((w)=>jsxRuntimeExports.jsx("button", {
                            className: "message-bubble__emoji-picker-btn",
                            onClick: ()=>y(w),
                            children: w
                        }, w))
                }),
                jsxRuntimeExports.jsx("div", {
                    className: `message-bubble__avatar-col ${t ? "" : "message-bubble__avatar-col--compact"}`,
                    children: t && jsxRuntimeExports.jsx(Avatar, {
                        name: e.senderDisplayName,
                        size: 40,
                        imageUrl: e.senderAvatarUrl
                    })
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "message-bubble__content",
                    children: [
                        e.replyToEventId && e.replyToSender && jsxRuntimeExports.jsxs("div", {
                            className: "message-bubble__reply-quote",
                            onClick: ()=>v?.(e.replyToEventId),
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__reply-sender",
                                    children: e.replyToSender
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__reply-text",
                                    children: e.replyToBody || "..."
                                })
                            ]
                        }),
                        t && jsxRuntimeExports.jsxs("div", {
                            className: "message-bubble__header",
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__sender",
                                    style: {
                                        color: getSenderColor(e.sender)
                                    },
                                    children: e.senderDisplayName
                                }),
                                e.sender.startsWith("@bot_") && jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__bot-badge",
                                    children: "БОТ"
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__time",
                                    children: formatTime$1(e.timestamp)
                                }),
                                i && jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__pin-badge",
                                    title: "Закреплено",
                                    children: jsxRuntimeExports.jsx(Pin, {
                                        size: 12
                                    })
                                })
                            ]
                        }),
                        e.type === "sticker" ? jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__sticker-content",
                            children: e.mimetype === "application/json" && e.imageUrl ? jsxRuntimeExports.jsx(LottieSticker, {
                                url: e.imageUrl,
                                width: Math.min(e.imageWidth || 200, 200),
                                height: Math.min(e.imageHeight || 200, 200)
                            }) : e.imageUrl ? jsxRuntimeExports.jsx("img", {
                                src: e.imageUrl,
                                alt: e.body,
                                className: "sticker-image",
                                style: {
                                    maxWidth: Math.min(e.imageWidth || 200, 200),
                                    maxHeight: 200
                                }
                            }) : jsxRuntimeExports.jsx("span", {
                                children: e.body
                            })
                        }) : e.type === "gif" ? jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__gif",
                            children: jsxRuntimeExports.jsx("img", {
                                src: e.imageUrl || "",
                                alt: e.body,
                                loading: "lazy",
                                style: {
                                    maxWidth: Math.min(e.imageWidth || 350, 350)
                                }
                            })
                        }) : e.type === "code" ? jsxRuntimeExports.jsx(CodeSnippet, {
                            body: e.body,
                            codeContext: e.codeContext
                        }) : e.type === "encrypted" ? jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__encrypted",
                            children: e.body
                        }) : e.type === "image" ? jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__image",
                            children: jsxRuntimeExports.jsx("a", {
                                href: e.imageUrl || "#",
                                target: "_blank",
                                rel: "noopener noreferrer",
                                children: jsxRuntimeExports.jsx("img", {
                                    src: e.thumbnailUrl || e.imageUrl || "",
                                    alt: e.body,
                                    className: "message-bubble__image-img",
                                    loading: "lazy",
                                    style: {
                                        maxWidth: Math.min(e.imageWidth || 400, 400),
                                        maxHeight: 300
                                    }
                                })
                            })
                        }) : e.type === "file" ? jsxRuntimeExports.jsxs("div", {
                            className: "message-bubble__file",
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "message-bubble__file-icon",
                                    children: jsxRuntimeExports.jsx(FileText, {
                                        size: 24
                                    })
                                }),
                                jsxRuntimeExports.jsxs("div", {
                                    className: "message-bubble__file-info",
                                    children: [
                                        jsxRuntimeExports.jsx("span", {
                                            className: "message-bubble__file-name",
                                            children: e.body
                                        }),
                                        jsxRuntimeExports.jsx("span", {
                                            className: "message-bubble__file-size",
                                            children: e.fileSize ? formatFileSize(e.fileSize) : ""
                                        })
                                    ]
                                }),
                                e.fileUrl && jsxRuntimeExports.jsx("a", {
                                    href: e.fileUrl,
                                    download: e.body,
                                    className: "message-bubble__file-download",
                                    title: "Скачать",
                                    children: jsxRuntimeExports.jsx(Download, {
                                        size: 18
                                    })
                                })
                            ]
                        }) : jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__body",
                            dangerouslySetInnerHTML: {
                                __html: renderMarkdown(e.body)
                            }
                        }),
                        r && r.length > 0 && jsxRuntimeExports.jsx("div", {
                            className: "message-bubble__reactions",
                            children: r.map((w)=>jsxRuntimeExports.jsxs("button", {
                                    className: `reaction-chip ${w.myReactionEventId ? "reaction-chip--active" : ""}`,
                                    onClick: ()=>b(w),
                                    title: w.users.join(", "),
                                    children: [
                                        jsxRuntimeExports.jsx("span", {
                                            className: "reaction-chip__emoji",
                                            children: w.emoji
                                        }),
                                        jsxRuntimeExports.jsx("span", {
                                            className: "reaction-chip__count",
                                            children: w.count
                                        })
                                    ]
                                }, w.emoji))
                        }),
                        s && s.replyCount > 0 && jsxRuntimeExports.jsxs("div", {
                            className: "thread-indicator",
                            onClick: ()=>u?.(e.id),
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "thread-indicator__icon",
                                    children: jsxRuntimeExports.jsx(MessageSquare, {
                                        size: 14
                                    })
                                }),
                                jsxRuntimeExports.jsxs("span", {
                                    className: "thread-indicator__count",
                                    children: [
                                        s.replyCount,
                                        " ",
                                        pluralReplies$1(s.replyCount)
                                    ]
                                }),
                                s.lastReply && jsxRuntimeExports.jsxs("span", {
                                    className: "thread-indicator__last",
                                    children: [
                                        s.lastReply.sender,
                                        " · ",
                                        formatTime$1(s.lastReply.ts)
                                    ]
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "thread-indicator__arrow",
                                    children: jsxRuntimeExports.jsx(ChevronRight, {
                                        size: 12
                                    })
                                })
                            ]
                        })
                    ]
                }),
                S && isTouchDevice && jsxRuntimeExports.jsx("div", {
                    className: "mobile-action-sheet-overlay",
                    onClick: ()=>_(!1),
                    children: jsxRuntimeExports.jsxs("div", {
                        className: "mobile-action-sheet",
                        onClick: (w)=>w.stopPropagation(),
                        children: [
                            jsxRuntimeExports.jsxs("button", {
                                onClick: ()=>{
                                    a?.(e), _(!1);
                                },
                                children: [
                                    jsxRuntimeExports.jsx(Reply, {
                                        size: 18
                                    }),
                                    " Ответить"
                                ]
                            }),
                            jsxRuntimeExports.jsxs("button", {
                                onClick: ()=>{
                                    _(!1), d(!0);
                                },
                                children: [
                                    jsxRuntimeExports.jsx(SmilePlus, {
                                        size: 18
                                    }),
                                    " Реакция"
                                ]
                            }),
                            jsxRuntimeExports.jsxs("button", {
                                onClick: ()=>{
                                    u?.(e.id), _(!1);
                                },
                                children: [
                                    jsxRuntimeExports.jsx(MessageSquare, {
                                        size: 18
                                    }),
                                    " Тред"
                                ]
                            }),
                            jsxRuntimeExports.jsxs("button", {
                                onClick: ()=>{
                                    c?.(e.id), _(!1);
                                },
                                children: [
                                    jsxRuntimeExports.jsx(Pin, {
                                        size: 18
                                    }),
                                    " ",
                                    i ? "Открепить" : "Закрепить"
                                ]
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "mobile-action-sheet__cancel",
                                onClick: ()=>_(!1),
                                children: "Отмена"
                            })
                        ]
                    })
                })
            ]
        });
    }, SAME_AUTHOR_THRESHOLD = 5 * 60 * 1e3;
    function formatDayLabel(e) {
        const t = new Date(e), r = new Date, i = new Date(r.getFullYear(), r.getMonth(), r.getDate()), s = new Date(t.getFullYear(), t.getMonth(), t.getDate()), a = i.getTime() - s.getTime();
        return a === 0 ? "Сегодня" : a === 864e5 ? "Вчера" : t.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
    function getDayKey(e) {
        const t = new Date(e);
        return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    }
    const MessageList = ({ messages: e, reactions: t, pinnedIds: r, threadSummaries: i, typingUsers: s, scrollToEventId: a, onScrollComplete: o, onLoadMore: h, onReply: c, onReact: u, onRemoveReaction: v, onPin: C, onOpenThread: d })=>{
        const S = reactExports.useRef(null), _ = reactExports.useRef(!0), g = reactExports.useCallback(()=>{
            const w = S.current;
            w && (_.current = w.scrollHeight - w.scrollTop - w.clientHeight < 40);
        }, []);
        reactExports.useEffect(()=>{
            const w = S.current;
            w && _.current && (w.scrollTop = w.scrollHeight);
        }, [
            e
        ]);
        const T = reactExports.useCallback((w)=>{
            const j = S.current;
            if (!j) return;
            const M = j.querySelector(`[data-event-id="${w}"]`);
            M && (M.scrollIntoView({
                behavior: "smooth",
                block: "center"
            }), M.classList.add("message-bubble--highlight"), setTimeout(()=>M.classList.remove("message-bubble--highlight"), 2e3));
        }, []);
        reactExports.useEffect(()=>{
            a && (T(a), o?.());
        }, [
            a,
            T,
            o
        ]);
        const x = [];
        let E = "", y = "", b = 0;
        for (const w of e){
            const j = getDayKey(w.timestamp);
            j !== E && (x.push(jsxRuntimeExports.jsx("div", {
                className: "message-day-divider",
                children: formatDayLabel(w.timestamp)
            }, `day-${j}`)), E = j, y = "", b = 0);
            const M = w.sender !== y || w.timestamp - b > SAME_AUTHOR_THRESHOLD;
            x.push(jsxRuntimeExports.jsx(MessageBubble, {
                message: w,
                showAuthor: M,
                reactions: t?.get(w.id),
                isPinned: r?.has(w.id),
                threadSummary: i?.get(w.id),
                onReply: c,
                onReact: u,
                onRemoveReaction: v,
                onPin: C,
                onOpenThread: d,
                onScrollToMessage: T
            }, w.id)), y = w.sender, b = w.timestamp;
        }
        return jsxRuntimeExports.jsxs("div", {
            className: "message-list",
            ref: S,
            onScroll: g,
            children: [
                jsxRuntimeExports.jsx("div", {
                    className: "message-list__load-more",
                    children: jsxRuntimeExports.jsx("button", {
                        onClick: h,
                        children: "Загрузить ранее"
                    })
                }),
                x,
                s && s.length > 0 && jsxRuntimeExports.jsxs("div", {
                    className: "typing-indicator",
                    children: [
                        jsxRuntimeExports.jsxs("span", {
                            className: "typing-indicator__dots",
                            children: [
                                jsxRuntimeExports.jsx("span", {}),
                                jsxRuntimeExports.jsx("span", {}),
                                jsxRuntimeExports.jsx("span", {})
                            ]
                        }),
                        jsxRuntimeExports.jsxs("span", {
                            className: "typing-indicator__text",
                            children: [
                                s.join(", "),
                                s.length === 1 ? " набирает..." : " набирают..."
                            ]
                        })
                    ]
                })
            ]
        });
    };
    class CommandRegistry {
        commands = [];
        loaded = !1;
        async load() {
            try {
                const t = getConfig().botApiUrl, r = await fetch(`${t}/commands`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                this.commands = await r.json(), this.loaded = !0;
            } catch (t) {
                console.warn("Не удалось загрузить команды ботов:", t), this.commands = [
                    {
                        command: "/help",
                        description: "Список доступных команд",
                        usage: "/help [бот]",
                        botId: "helper",
                        botName: "Uplink Helper"
                    }
                ];
            }
        }
        search(t) {
            if (!t.startsWith("/")) return [];
            const r = t.toLowerCase();
            return this.commands.filter((i)=>i.command.toLowerCase().startsWith(r)).slice(0, 8);
        }
        isCommand(t) {
            return t.startsWith("/") && this.commands.some((r)=>t.startsWith(r.command.split(" ")[0]));
        }
        getAll() {
            return [
                ...this.commands
            ];
        }
        isLoaded() {
            return this.loaded;
        }
    }
    const commandRegistry = new CommandRegistry;
    class GifService {
        get baseUrl() {
            return config.gifApiUrl;
        }
        async search(t, r = 20, i) {
            const s = new URLSearchParams({
                q: t,
                limit: String(r)
            });
            i && s.set("pos", i);
            const a = await fetch(`${this.baseUrl}/search?${s}`, {
                cache: "no-cache"
            });
            if (!a.ok) throw new Error(`GIF API: ${a.status}`);
            const o = await a.json();
            if (o.error) throw new Error(o.error.message || o.error);
            return {
                results: this.parseResults(o.results || []),
                next: o.next || ""
            };
        }
        async trending(t = 20, r) {
            const i = new URLSearchParams({
                limit: String(t)
            });
            r && i.set("pos", r);
            const s = await fetch(`${this.baseUrl}/trending?${i}`, {
                cache: "no-cache"
            });
            if (!s.ok) throw new Error(`GIF API: ${s.status}`);
            const a = await s.json();
            if (a.error) throw new Error(a.error.message || a.error);
            return {
                results: this.parseResults(a.results || []),
                next: a.next || ""
            };
        }
        parseResults(t) {
            return t.map((r)=>{
                const i = r.media_formats?.gif || {}, s = r.media_formats?.tinygif || i;
                return {
                    id: r.id,
                    title: r.title || "",
                    gifUrl: i.url || "",
                    previewUrl: s.url || i.url || "",
                    width: i.dims?.[0] || 300,
                    height: i.dims?.[1] || 200
                };
            }).filter((r)=>r.gifUrl);
        }
    }
    const gifService = new GifService, STICKER_ROOM_ALIAS = "#sticker-packs:uplink.local", STICKER_PACK_EVENT = "dev.uplink.sticker_pack", STICKER_PREFS_EVENT = "dev.uplink.sticker_prefs", MAX_RECENT = 30;
    class StickerService {
        catalogRoomId = null;
        async getCatalogRoomId() {
            if (this.catalogRoomId) {
                if (matrixService.getClient().getRoom(this.catalogRoomId)) return this.catalogRoomId;
                this.catalogRoomId = null;
            }
            const t = matrixService.getClient();
            try {
                const a = await t.getRoomIdForAlias(STICKER_ROOM_ALIAS);
                this.catalogRoomId = a.room_id;
                try {
                    await t.joinRoom(this.catalogRoomId);
                } catch  {}
                return this.catalogRoomId;
            } catch  {}
            const i = t.getRooms().find((a)=>{
                const o = a.getAltAliases?.() || [];
                return (a.getCanonicalAlias?.() || "") === STICKER_ROOM_ALIAS || o.includes(STICKER_ROOM_ALIAS) || a.name === "Стикерпаки";
            });
            if (i) return this.catalogRoomId = i.roomId, this.catalogRoomId;
            const s = await t.createRoom({
                name: "Стикерпаки",
                room_alias_name: "sticker-packs",
                visibility: "private",
                preset: "public_chat",
                initial_state: [
                    {
                        type: "m.room.join_rules",
                        state_key: "",
                        content: {
                            join_rule: "public"
                        }
                    }
                ]
            });
            return this.catalogRoomId = s.room_id, this.catalogRoomId;
        }
        async getAllPacks() {
            const t = await this.getCatalogRoomId(), i = matrixService.getClient().getRoom(t);
            return i ? i.currentState.getStateEvents(STICKER_PACK_EVENT).filter((a)=>a.getContent()?.name).map((a)=>({
                    ...a.getContent(),
                    id: a.getStateKey()
                })) : [];
        }
        async getEnabledPacks() {
            const t = await this.getAllPacks(), i = this.getPrefs().enabled_packs || [];
            return i.length === 0 ? t : t.filter((s)=>i.includes(s.id));
        }
        async createPack(t, r, i) {
            const s = await this.getCatalogRoomId(), a = matrixService.getClient(), o = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await a.sendStateEvent(s, STICKER_PACK_EVENT, {
                name: t,
                author: a.getUserId(),
                authorName: matrixService.users.getDisplayName(a.getUserId()),
                thumbnail: i,
                stickers: r,
                created_at: Date.now()
            }, o);
            const h = this.getPrefs();
            return h.enabled_packs = [
                ...h.enabled_packs || [],
                o
            ], await this.setPrefs(h), o;
        }
        async deletePack(t) {
            const r = await this.getCatalogRoomId();
            await matrixService.getClient().sendStateEvent(r, STICKER_PACK_EVENT, {}, t);
        }
        async togglePack(t, r) {
            const i = this.getPrefs(), s = new Set(i.enabled_packs || []);
            r ? s.add(t) : s.delete(t), i.enabled_packs = [
                ...s
            ], await this.setPrefs(i);
        }
        async recordUsage(t, r) {
            const i = this.getPrefs(), a = (i.recent || []).filter((o)=>!(o.pack_id === t && o.sticker_id === r));
            a.unshift({
                pack_id: t,
                sticker_id: r,
                ts: Date.now()
            }), i.recent = a.slice(0, MAX_RECENT), await this.setPrefs(i);
        }
        getRecent() {
            return this.getPrefs().recent || [];
        }
        async sendSticker(t, r) {
            await matrixService.getClient().sendEvent(t, "m.sticker", {
                body: r.body,
                url: r.url,
                info: r.info
            });
        }
        async uploadSticker(t) {
            const s = (await matrixService.getClient().uploadContent(t, {
                type: t.type
            })).content_uri;
            let a = 256, o = 256, h = t.type;
            if (t.name.endsWith(".json") || t.type === "application/json") {
                h = "application/json";
                try {
                    const c = await t.text(), u = JSON.parse(c);
                    a = u.w || 256, o = u.h || 256;
                } catch  {}
            } else {
                const c = await matrixService.media.getImageDimensions(t);
                a = c.width || 256, o = c.height || 256;
            }
            return {
                url: s,
                info: {
                    mimetype: h,
                    w: a,
                    h: o,
                    size: t.size
                }
            };
        }
        getPrefs() {
            return matrixService.getClient().getAccountData(STICKER_PREFS_EVENT)?.getContent() || {
                enabled_packs: [],
                recent: []
            };
        }
        async setPrefs(t) {
            await matrixService.getClient().setAccountData(STICKER_PREFS_EVENT, t);
        }
    }
    const stickerService = new StickerService, StickerGifPanel = ({ onClose: e, onSendGif: t, onSendSticker: r, onOpenCreatePack: i, onOpenPackManager: s })=>{
        const [a, o] = reactExports.useState("gif"), [h, c] = reactExports.useState(""), [u, v] = reactExports.useState([]), [C, d] = reactExports.useState(""), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState([]), [x, E] = reactExports.useState(null), [y, b] = reactExports.useState([]), [w, j] = reactExports.useState(null), M = reactExports.useRef(null), I = reactExports.useRef(null);
        reactExports.useEffect(()=>{
            const R = (N)=>{
                I.current && !I.current.contains(N.target) && (N.target.closest(".message-input__action-btn") || e());
            }, L = setTimeout(()=>{
                document.addEventListener("mousedown", R);
            }, 100);
            return ()=>{
                clearTimeout(L), document.removeEventListener("mousedown", R);
            };
        }, [
            e
        ]), reactExports.useEffect(()=>{
            stickerService.getEnabledPacks().then(T).catch(()=>{}), U();
        }, []), reactExports.useEffect(()=>{
            a === "gif" && u.length === 0 && !h && B();
        }, [
            a
        ]);
        const D = reactExports.useRef();
        reactExports.useEffect(()=>(clearTimeout(D.current), a === "gif" && (D.current = setTimeout(()=>{
                h.trim() ? G(h) : B();
            }, 300)), ()=>clearTimeout(D.current)), [
            h,
            a
        ]), reactExports.useEffect(()=>{
            const R = (L)=>{
                L.key === "Escape" && e();
            };
            return document.addEventListener("keydown", R), ()=>document.removeEventListener("keydown", R);
        }, [
            e
        ]);
        const B = async ()=>{
            _(!0), j(null);
            try {
                const R = await gifService.trending(30);
                v(R.results), d(R.next), R.results.length === 0 && j("GIF-сервис временно недоступен");
            } catch (R) {
                const L = R instanceof Error ? R.message : "";
                L.includes("API key") || L.includes("400") || L.includes("403") ? j("Tenor API ключ невалиден. Обновите TENOR_API_KEY в docker/.env") : j("Не удалось загрузить GIF"), console.error("GIF load error:", R);
            } finally{
                _(!1);
            }
        }, G = async (R)=>{
            _(!0), j(null);
            try {
                const L = await gifService.search(R, 30);
                v(L.results), d(L.next);
            } catch  {
                j("Ошибка поиска GIF");
            } finally{
                _(!1);
            }
        }, V = reactExports.useCallback(async ()=>{
            if (!(!C || S)) {
                _(!0);
                try {
                    const R = h.trim() ? await gifService.search(h, 20, C) : await gifService.trending(20, C);
                    v((L)=>[
                            ...L,
                            ...R.results
                        ]), d(R.next);
                } finally{
                    _(!1);
                }
            }
        }, [
            C,
            S,
            h
        ]), U = async ()=>{
            const R = stickerService.getRecent();
            try {
                const L = await stickerService.getAllPacks(), N = R.map(($)=>{
                    const O = L.find((Y)=>Y.id === $.pack_id), H = O?.stickers.find((Y)=>Y.id === $.sticker_id);
                    return O && H ? {
                        sticker: H,
                        pack: O
                    } : null;
                }).filter(Boolean);
                b(N);
            } catch  {}
        }, W = (R)=>{
            t(R), e();
        }, z = async (R, L)=>{
            r(R, L), await stickerService.recordUsage(L, R.id).catch(()=>{}), e();
        }, A = g.find((R)=>R.id === x), F = x === null ? y.map((R)=>({
                ...R.sticker,
                _packId: R.pack.id
            })) : (A?.stickers || []).map((R)=>({
                ...R,
                _packId: x
            })), P = h.trim() ? F.filter((R)=>R.body.toLowerCase().includes(h.toLowerCase())) : F;
        return jsxRuntimeExports.jsxs("div", {
            className: "sticker-gif-panel",
            ref: I,
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "sticker-gif-panel__tabs",
                    children: [
                        jsxRuntimeExports.jsx("button", {
                            className: `sticker-gif-panel__tab ${a === "gif" ? "sticker-gif-panel__tab--active" : ""}`,
                            onClick: ()=>{
                                o("gif"), c("");
                            },
                            children: "GIF"
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: `sticker-gif-panel__tab ${a === "stickers" ? "sticker-gif-panel__tab--active" : ""}`,
                            onClick: ()=>{
                                o("stickers"), c("");
                            },
                            children: "Стикеры"
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "sticker-gif-panel__close",
                            onClick: e,
                            title: "Закрыть",
                            children: jsxRuntimeExports.jsx(X, {
                                size: 16
                            })
                        })
                    ]
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "sticker-gif-panel__search",
                    children: [
                        jsxRuntimeExports.jsx(Search, {
                            size: 14,
                            className: "sticker-gif-panel__search-icon"
                        }),
                        jsxRuntimeExports.jsx("input", {
                            ref: M,
                            type: "text",
                            placeholder: a === "gif" ? "Поиск GIF..." : "Поиск стикеров...",
                            value: h,
                            onChange: (R)=>c(R.target.value),
                            className: "sticker-gif-panel__search-input"
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "sticker-gif-panel__content",
                    onScroll: a === "gif" ? (R)=>{
                        const L = R.currentTarget;
                        L.scrollTop + L.clientHeight >= L.scrollHeight - 100 && V();
                    } : void 0,
                    children: a === "gif" ? jsxRuntimeExports.jsxs("div", {
                        className: "sticker-gif-panel__gif-grid",
                        children: [
                            u.map((R)=>jsxRuntimeExports.jsx("div", {
                                    className: "sticker-gif-panel__gif-item",
                                    onClick: ()=>W(R),
                                    children: jsxRuntimeExports.jsx("img", {
                                        src: R.previewUrl,
                                        alt: R.title,
                                        loading: "lazy",
                                        style: {
                                            aspectRatio: `${R.width}/${R.height}`
                                        }
                                    })
                                }, R.id)),
                            S && jsxRuntimeExports.jsx("div", {
                                className: "sticker-gif-panel__loading",
                                children: "Загрузка..."
                            }),
                            w && jsxRuntimeExports.jsx("div", {
                                className: "sticker-gif-panel__empty",
                                children: w
                            }),
                            !S && !w && u.length === 0 && jsxRuntimeExports.jsx("div", {
                                className: "sticker-gif-panel__empty",
                                children: h ? "Ничего не найдено" : "Загрузка GIF..."
                            })
                        ]
                    }) : jsxRuntimeExports.jsxs("div", {
                        className: "sticker-gif-panel__sticker-grid",
                        children: [
                            P.map((R)=>jsxRuntimeExports.jsx("div", {
                                    className: "sticker-gif-panel__sticker-item",
                                    onClick: ()=>z(R, R._packId),
                                    title: R.body,
                                    children: R.info.mimetype === "application/json" ? jsxRuntimeExports.jsx(LottieSticker, {
                                        url: matrixService.media.mxcToHttpDownload(R.url) || "",
                                        width: 72,
                                        height: 72,
                                        loop: !1
                                    }) : jsxRuntimeExports.jsx("img", {
                                        src: matrixService.media.mxcToHttp(R.url, 96) || "",
                                        alt: R.body,
                                        loading: "lazy"
                                    })
                                }, `${R._packId}-${R.id}`)),
                            P.length === 0 && jsxRuntimeExports.jsx("div", {
                                className: "sticker-gif-panel__empty",
                                children: x === null ? "Нет недавних стикеров. Выберите пак снизу." : h ? "Стикеры не найдены" : "В этом паке нет стикеров"
                            })
                        ]
                    })
                }),
                a === "stickers" && jsxRuntimeExports.jsxs("div", {
                    className: "sticker-gif-panel__packs",
                    children: [
                        jsxRuntimeExports.jsx("button", {
                            className: `sticker-gif-panel__pack-btn ${x === null ? "sticker-gif-panel__pack-btn--active" : ""}`,
                            onClick: ()=>E(null),
                            title: "Недавние",
                            children: jsxRuntimeExports.jsx(Clock, {
                                size: 16
                            })
                        }),
                        g.map((R)=>jsxRuntimeExports.jsx("button", {
                                className: `sticker-gif-panel__pack-btn ${x === R.id ? "sticker-gif-panel__pack-btn--active" : ""}`,
                                onClick: ()=>E(R.id),
                                title: R.name,
                                children: R.thumbnail ? jsxRuntimeExports.jsx("img", {
                                    src: matrixService.media.mxcToHttp(R.thumbnail, 48) || "",
                                    alt: R.name
                                }) : jsxRuntimeExports.jsx("span", {
                                    children: R.name.charAt(0)
                                })
                            }, R.id)),
                        jsxRuntimeExports.jsx("button", {
                            className: "sticker-gif-panel__pack-btn sticker-gif-panel__pack-btn--add",
                            onClick: i,
                            title: "Создать стикерпак",
                            children: jsxRuntimeExports.jsx(Plus, {
                                size: 16
                            })
                        }),
                        s && jsxRuntimeExports.jsx("button", {
                            className: "sticker-gif-panel__pack-btn",
                            onClick: s,
                            title: "Управление паками",
                            children: jsxRuntimeExports.jsx(Settings, {
                                size: 14
                            })
                        })
                    ]
                }),
                a === "gif" && jsxRuntimeExports.jsx("div", {
                    className: "sticker-gif-panel__tenor-attr",
                    children: "Powered by GIPHY"
                })
            ]
        });
    }, CreateStickerPackModal = ({ onClose: e, onCreated: t })=>{
        const [r, i] = reactExports.useState(""), [s, a] = reactExports.useState([]), [o, h] = reactExports.useState(!1), [c, u] = reactExports.useState(""), v = reactExports.useRef(null), C = (g)=>{
            if (!g) return;
            const x = Array.from(g).filter((E)=>E.type.startsWith("image/") || E.type === "application/json" || E.name.endsWith(".json")).map((E)=>({
                    file: E,
                    previewUrl: E.type.startsWith("image/") ? URL.createObjectURL(E) : "",
                    body: E.name.replace(/\.[^.]+$/, ""),
                    uploading: !1
                }));
            a((E)=>[
                    ...E,
                    ...x
                ]);
        }, d = (g)=>{
            a((T)=>{
                const x = [
                    ...T
                ];
                return x[g].previewUrl && URL.revokeObjectURL(x[g].previewUrl), x.splice(g, 1), x;
            });
        }, S = (g, T)=>{
            a((x)=>{
                const E = [
                    ...x
                ];
                return E[g] = {
                    ...E[g],
                    body: T
                }, E;
            });
        }, _ = async ()=>{
            if (!r.trim()) {
                u("Введите название пака");
                return;
            }
            if (s.length === 0) {
                u("Добавьте хотя бы один стикер");
                return;
            }
            h(!0), u("");
            try {
                const g = [];
                for(let x = 0; x < s.length; x++){
                    const E = s[x];
                    a((w)=>{
                        const j = [
                            ...w
                        ];
                        return j[x] = {
                            ...j[x],
                            uploading: !0
                        }, j;
                    });
                    const y = await stickerService.uploadSticker(E.file), b = {
                        id: `s${x}_${Date.now()}`,
                        body: E.body || E.file.name,
                        url: y.url,
                        info: y.info
                    };
                    g.push(b), a((w)=>{
                        const j = [
                            ...w
                        ];
                        return j[x] = {
                            ...j[x],
                            uploading: !1,
                            uploaded: y
                        }, j;
                    });
                }
                const T = g[0]?.url || "";
                await stickerService.createPack(r.trim(), g, T), t(), e();
            } catch (g) {
                u(`Ошибка: ${g.message}`), h(!1);
            }
        };
        return jsxRuntimeExports.jsx("div", {
            className: "modal-overlay",
            onClick: e,
            children: jsxRuntimeExports.jsxs("div", {
                className: "create-sticker-modal",
                onClick: (g)=>g.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "create-sticker-modal__header",
                        children: [
                            jsxRuntimeExports.jsx("h3", {
                                children: "Создать стикерпак"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "create-sticker-modal__close",
                                onClick: e,
                                children: jsxRuntimeExports.jsx(X, {
                                    size: 18
                                })
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "create-sticker-modal__body",
                        children: [
                            jsxRuntimeExports.jsx("input", {
                                type: "text",
                                className: "create-sticker-modal__name-input",
                                placeholder: "Название пака...",
                                value: r,
                                onChange: (g)=>i(g.target.value),
                                maxLength: 50
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "create-sticker-modal__dropzone",
                                onClick: ()=>v.current?.click(),
                                onDragOver: (g)=>{
                                    g.preventDefault(), g.currentTarget.classList.add("create-sticker-modal__dropzone--active");
                                },
                                onDragLeave: (g)=>{
                                    g.preventDefault(), g.currentTarget.classList.remove("create-sticker-modal__dropzone--active");
                                },
                                onDrop: (g)=>{
                                    g.preventDefault(), g.currentTarget.classList.remove("create-sticker-modal__dropzone--active"), C(g.dataTransfer.files);
                                },
                                children: [
                                    jsxRuntimeExports.jsx(Upload, {
                                        size: 24
                                    }),
                                    jsxRuntimeExports.jsx("span", {
                                        children: "PNG, WebP, Lottie JSON — до 256x256"
                                    }),
                                    jsxRuntimeExports.jsx("input", {
                                        ref: v,
                                        type: "file",
                                        accept: "image/png,image/webp,image/gif,application/json,.json",
                                        multiple: !0,
                                        style: {
                                            display: "none"
                                        },
                                        onChange: (g)=>{
                                            C(g.target.files), v.current && (v.current.value = "");
                                        }
                                    })
                                ]
                            }),
                            s.length > 0 && jsxRuntimeExports.jsx("div", {
                                className: "create-sticker-modal__stickers",
                                children: s.map((g, T)=>jsxRuntimeExports.jsxs("div", {
                                        className: "create-sticker-modal__sticker-item",
                                        children: [
                                            jsxRuntimeExports.jsxs("div", {
                                                className: "create-sticker-modal__sticker-preview",
                                                children: [
                                                    g.previewUrl ? jsxRuntimeExports.jsx("img", {
                                                        src: g.previewUrl,
                                                        alt: g.body
                                                    }) : jsxRuntimeExports.jsxs("div", {
                                                        className: "create-sticker-modal__lottie-placeholder",
                                                        children: [
                                                            jsxRuntimeExports.jsx(Image$1, {
                                                                size: 24
                                                            }),
                                                            jsxRuntimeExports.jsx("span", {
                                                                children: "Lottie"
                                                            })
                                                        ]
                                                    }),
                                                    g.uploading && jsxRuntimeExports.jsx("div", {
                                                        className: "create-sticker-modal__uploading"
                                                    })
                                                ]
                                            }),
                                            jsxRuntimeExports.jsx("input", {
                                                type: "text",
                                                className: "create-sticker-modal__sticker-body",
                                                value: g.body,
                                                onChange: (x)=>S(T, x.target.value),
                                                placeholder: "Описание"
                                            }),
                                            jsxRuntimeExports.jsx("button", {
                                                className: "create-sticker-modal__sticker-remove",
                                                onClick: ()=>d(T),
                                                disabled: o,
                                                children: jsxRuntimeExports.jsx(Trash2, {
                                                    size: 14
                                                })
                                            })
                                        ]
                                    }, T))
                            }),
                            c && jsxRuntimeExports.jsx("div", {
                                className: "create-sticker-modal__error",
                                children: c
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "create-sticker-modal__footer",
                        children: [
                            jsxRuntimeExports.jsx("button", {
                                className: "create-sticker-modal__cancel",
                                onClick: e,
                                disabled: o,
                                children: "Отмена"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "create-sticker-modal__submit",
                                onClick: _,
                                disabled: o || s.length === 0,
                                children: o ? "Создание..." : `Создать (${s.length})`
                            })
                        ]
                    })
                ]
            })
        });
    }, MessageInput = ({ onSend: e, onSendReply: t, onSendFile: r, roomId: i, roomName: s, replyTo: a, onCancelReply: o, pendingText: h, onPendingTextConsumed: c })=>{
        const [u, v] = reactExports.useState(""), [C, d] = reactExports.useState(!1), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState([]), [x, E] = reactExports.useState(0), [y, b] = reactExports.useState(!1), [w, j] = reactExports.useState(!1), M = reactExports.useRef(null), I = reactExports.useRef(null), D = reactExports.useRef();
        reactExports.useEffect(()=>{
            commandRegistry.isLoaded() || commandRegistry.load();
        }, []);
        const B = reactExports.useCallback(()=>{
            const O = M.current;
            O && (O.style.height = "auto", O.style.height = Math.min(O.scrollHeight, 150) + "px");
        }, []);
        reactExports.useEffect(()=>{
            a && M.current?.focus();
        }, [
            a
        ]), reactExports.useEffect(()=>{
            h && (v((O)=>O ? O + `
` + h : h), M.current?.focus(), c?.());
        }, [
            h,
            c
        ]), reactExports.useEffect(()=>()=>{
                i && matrixService.users.sendTyping(i, !1).catch(()=>{}), D.current && clearTimeout(D.current);
            }, [
            i
        ]);
        const G = ()=>{
            const O = u.trim();
            O && (a && t ? (t(a.eventId, O), o?.()) : e(O), v(""), M.current && (M.current.style.height = "auto"), i && matrixService.users.sendTyping(i, !1).catch(()=>{}), D.current && clearTimeout(D.current));
        }, V = (O)=>{
            const H = O.target.value;
            if (v(H), B(), H.startsWith("/") && !H.includes(`
`)) {
                const Y = commandRegistry.search(H);
                T(Y), E(0);
            } else T([]);
            i && O.target.value.length > 0 ? (matrixService.users.sendTyping(i, !0).catch(()=>{}), D.current && clearTimeout(D.current), D.current = setTimeout(()=>{
                i && matrixService.users.sendTyping(i, !1).catch(()=>{});
            }, 4e3)) : i && (matrixService.users.sendTyping(i, !1).catch(()=>{}), D.current && clearTimeout(D.current));
        }, U = (O)=>{
            if (g.length > 0) {
                if (O.key === "ArrowDown") {
                    O.preventDefault(), E((H)=>Math.min(H + 1, g.length - 1));
                    return;
                }
                if (O.key === "ArrowUp") {
                    O.preventDefault(), E((H)=>Math.max(H - 1, 0));
                    return;
                }
                if (O.key === "Tab") {
                    O.preventDefault();
                    const H = g[x];
                    v(H.command + " "), T([]);
                    return;
                }
                if (O.key === "Escape") {
                    T([]);
                    return;
                }
            }
            O.key === "Enter" && !O.shiftKey && (O.preventDefault(), T([]), G()), O.key === "Escape" && a && o?.();
        }, W = async (O)=>{
            if (!S) {
                if (O.size > 50 * 1024 * 1024) {
                    alert("Максимальный размер файла — 50 МБ");
                    return;
                }
                _(!0);
                try {
                    await r(O);
                } catch (H) {
                    console.error("Ошибка отправки файла:", H);
                } finally{
                    _(!1);
                }
            }
        }, z = ()=>{
            I.current?.click();
        }, A = (O)=>{
            const H = O.target.files?.[0];
            H && W(H), I.current && (I.current.value = "");
        }, F = (O)=>{
            O.preventDefault(), O.stopPropagation(), d(!0);
        }, P = (O)=>{
            O.preventDefault(), O.stopPropagation(), d(!1);
        }, R = (O)=>{
            O.preventDefault(), O.stopPropagation(), d(!1);
            const H = O.dataTransfer.files[0];
            H && W(H);
        }, L = reactExports.useCallback(async (O)=>{
            i && await matrixService.messages.sendGif(i, O);
        }, [
            i
        ]), N = reactExports.useCallback(async (O, H)=>{
            i && await stickerService.sendSticker(i, O);
        }, [
            i
        ]), $ = (O)=>{
            const H = O.clipboardData?.items;
            if (H) {
                for (const Y of Array.from(H))if (Y.type.startsWith("image/")) {
                    O.preventDefault();
                    const Z = Y.getAsFile();
                    Z && W(Z);
                    return;
                }
            }
        };
        return jsxRuntimeExports.jsxs("div", {
            className: `message-input ${C ? "message-input--drag-over" : ""}`,
            onDragOver: F,
            onDragLeave: P,
            onDrop: R,
            children: [
                C && jsxRuntimeExports.jsx("div", {
                    className: "message-input__drop-overlay",
                    children: "Отпустите чтобы отправить файл"
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "message-input__wrapper",
                    children: [
                        y && i && jsxRuntimeExports.jsx(StickerGifPanel, {
                            roomId: i,
                            onClose: ()=>b(!1),
                            onSendGif: L,
                            onSendSticker: N,
                            onOpenCreatePack: ()=>{
                                b(!1), j(!0);
                            }
                        }),
                        g.length > 0 && jsxRuntimeExports.jsx("div", {
                            className: "command-suggestions",
                            children: g.map((O, H)=>jsxRuntimeExports.jsxs("div", {
                                    className: `command-suggestions__item ${H === x ? "command-suggestions__item--active" : ""}`,
                                    onClick: ()=>{
                                        v(O.command + " "), T([]), M.current?.focus();
                                    },
                                    children: [
                                        jsxRuntimeExports.jsx("span", {
                                            className: "command-suggestions__command",
                                            children: O.command
                                        }),
                                        jsxRuntimeExports.jsx("span", {
                                            className: "command-suggestions__bot",
                                            children: O.botName
                                        }),
                                        jsxRuntimeExports.jsx("span", {
                                            className: "command-suggestions__desc",
                                            children: O.description
                                        })
                                    ]
                                }, O.command))
                        }),
                        a && jsxRuntimeExports.jsxs("div", {
                            className: "message-input__reply-preview",
                            children: [
                                jsxRuntimeExports.jsx("div", {
                                    className: "message-input__reply-line"
                                }),
                                jsxRuntimeExports.jsxs("div", {
                                    className: "message-input__reply-content",
                                    children: [
                                        jsxRuntimeExports.jsx("span", {
                                            className: "message-input__reply-sender",
                                            children: a.sender
                                        }),
                                        jsxRuntimeExports.jsx("span", {
                                            className: "message-input__reply-text",
                                            children: a.body
                                        })
                                    ]
                                }),
                                jsxRuntimeExports.jsx("button", {
                                    className: "message-input__reply-close",
                                    onClick: o,
                                    children: jsxRuntimeExports.jsx(X, {
                                        size: 14
                                    })
                                })
                            ]
                        }),
                        S && jsxRuntimeExports.jsx("div", {
                            className: "message-input__uploading",
                            children: "Загрузка файла..."
                        }),
                        jsxRuntimeExports.jsxs("div", {
                            className: "message-input__row",
                            children: [
                                jsxRuntimeExports.jsx("textarea", {
                                    ref: M,
                                    className: "message-input__textarea",
                                    value: u,
                                    onChange: V,
                                    onKeyDown: U,
                                    onPaste: $,
                                    onFocus: ()=>{
                                        setTimeout(()=>{
                                            M.current?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "end"
                                            });
                                        }, 300);
                                    },
                                    placeholder: s ? `Написать в ${s}...` : "Написать сообщение...",
                                    rows: 1
                                }),
                                jsxRuntimeExports.jsxs("div", {
                                    className: "message-input__actions",
                                    children: [
                                        jsxRuntimeExports.jsx("input", {
                                            ref: I,
                                            type: "file",
                                            style: {
                                                display: "none"
                                            },
                                            onChange: A
                                        }),
                                        jsxRuntimeExports.jsx("button", {
                                            className: "message-input__action-btn",
                                            onClick: ()=>b(!y),
                                            title: "Стикеры и GIF",
                                            children: jsxRuntimeExports.jsx(Smile, {
                                                size: 18
                                            })
                                        }),
                                        jsxRuntimeExports.jsx("button", {
                                            className: "message-input__action-btn",
                                            onClick: z,
                                            disabled: S,
                                            title: "Прикрепить файл",
                                            children: jsxRuntimeExports.jsx(Paperclip, {
                                                size: 18
                                            })
                                        }),
                                        jsxRuntimeExports.jsx("button", {
                                            className: "message-input__send-btn",
                                            onClick: G,
                                            disabled: !u.trim() || S,
                                            title: "Отправить",
                                            children: jsxRuntimeExports.jsx(Send, {
                                                size: 16
                                            })
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                w && jsxRuntimeExports.jsx(CreateStickerPackModal, {
                    onClose: ()=>j(!1),
                    onCreated: ()=>j(!1)
                })
            ]
        });
    };
    function formatDuration(e) {
        const t = Math.floor(e / 60).toString().padStart(2, "0"), r = (e % 60).toString().padStart(2, "0");
        return `${t}:${r}`;
    }
    const CallBar = ({ roomName: e, participants: t, isMuted: r, isCameraOn: i, duration: s, onToggleMute: a, onToggleCamera: o, onLeave: h })=>jsxRuntimeExports.jsxs("div", {
            className: "call-bar",
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "call-bar__info",
                    children: [
                        jsxRuntimeExports.jsxs("span", {
                            className: "call-bar__title",
                            children: [
                                "#",
                                e
                            ]
                        }),
                        jsxRuntimeExports.jsx("span", {
                            className: "call-bar__duration",
                            children: formatDuration(s)
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "call-bar__participants",
                    children: t.map((c)=>jsxRuntimeExports.jsxs("span", {
                            className: `call-bar__participant ${c.isSpeaking ? "call-bar__participant--speaking" : ""} ${c.isMuted ? "call-bar__participant--muted" : ""}`,
                            children: [
                                c.displayName,
                                c.isLocal ? " (вы)" : "",
                                c.isCameraOn ? " cam" : ""
                            ]
                        }, c.identity))
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "call-bar__controls",
                    children: [
                        jsxRuntimeExports.jsx("button", {
                            className: `call-bar__btn call-bar__btn--mute ${r ? "call-bar__btn--active" : ""}`,
                            onClick: a,
                            title: r ? "Включить микрофон" : "Выключить микрофон",
                            children: r ? jsxRuntimeExports.jsx(MicOff, {
                                size: 16
                            }) : jsxRuntimeExports.jsx(Mic, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: `call-bar__btn call-bar__btn--camera ${i ? "call-bar__btn--active" : ""}`,
                            onClick: o,
                            title: i ? "Выключить камеру" : "Включить камеру",
                            children: i ? jsxRuntimeExports.jsx(Video, {
                                size: 16
                            }) : jsxRuntimeExports.jsx(VideoOff, {
                                size: 16
                            })
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "call-bar__btn call-bar__btn--leave",
                            onClick: h,
                            title: "Завершить звонок",
                            children: jsxRuntimeExports.jsx(PhoneOff, {
                                size: 16
                            })
                        })
                    ]
                })
            ]
        }), VideoTile = ({ identity: e, displayName: t, track: r })=>{
        const i = reactExports.useRef(null);
        reactExports.useEffect(()=>(i.current && r && (i.current.srcObject = new MediaStream([
                r
            ])), ()=>{
                i.current && (i.current.srcObject = null);
            }), [
            r
        ]);
        const s = t || e.split(":")[0].replace("@", "");
        return jsxRuntimeExports.jsxs("div", {
            className: "video-tile",
            children: [
                r ? jsxRuntimeExports.jsx("video", {
                    ref: i,
                    className: "video-tile__video",
                    autoPlay: !0,
                    playsInline: !0,
                    muted: !0
                }) : jsxRuntimeExports.jsx("div", {
                    className: "video-tile__placeholder",
                    children: jsxRuntimeExports.jsx("span", {
                        className: "video-tile__placeholder-icon",
                        children: "😎"
                    })
                }),
                jsxRuntimeExports.jsx("span", {
                    className: "video-tile__name",
                    children: s
                })
            ]
        });
    }, VideoGrid = ({ participants: e })=>{
        const [t, r] = reactExports.useState(new Map);
        return reactExports.useEffect(()=>livekitService.onVideoTrack((s, a)=>{
                r((o)=>{
                    const h = new Map(o);
                    return a ? h.set(s, a) : h.delete(s), h;
                });
            }), []), e.length === 0 ? null : jsxRuntimeExports.jsx("div", {
            className: "video-grid",
            children: e.map((i)=>jsxRuntimeExports.jsx(VideoTile, {
                    identity: i.identity,
                    displayName: i.displayName,
                    track: t.get(i.identity) || null
                }, i.identity))
        });
    }, MAX_AVATAR_SIZE = 512, MAX_AVATAR_BYTES = 1 * 1024 * 1024;
    function resizeImage(e, t = MAX_AVATAR_SIZE, r = MAX_AVATAR_BYTES) {
        return new Promise((i, s)=>{
            const a = new Image;
            a.onload = ()=>{
                if (a.width <= t && a.height <= t && e.size <= r) {
                    i(e);
                    return;
                }
                const o = Math.min(t / a.width, t / a.height, 1), h = Math.round(a.width * o), c = Math.round(a.height * o), u = document.createElement("canvas");
                u.width = h, u.height = c, u.getContext("2d").drawImage(a, 0, 0, h, c), u.toBlob((C)=>{
                    if (!C) return s(new Error("Canvas toBlob failed"));
                    i(new File([
                        C
                    ], e.name, {
                        type: "image/jpeg"
                    }));
                }, "image/jpeg", .85);
            }, a.onerror = ()=>s(new Error("Не удалось загрузить изображение")), a.src = URL.createObjectURL(e);
        });
    }
    const AvatarSection = ({ displayName: e })=>{
        const [t, r] = reactExports.useState(matrixService.users.getMyAvatarUrl()), [i, s] = reactExports.useState(!1), a = reactExports.useRef(null);
        reactExports.useEffect(()=>{
            matrixService.users.fetchMyAvatarUrl().then((c)=>{
                c && r(c);
            });
        }, []);
        const o = ()=>a.current?.click(), h = async (c)=>{
            const u = c.target.files?.[0];
            if (u) {
                if (!u.type.startsWith("image/")) {
                    alert("Выберите изображение (PNG, JPG, GIF)");
                    return;
                }
                s(!0);
                try {
                    const v = await resizeImage(u);
                    r(URL.createObjectURL(v)), await matrixService.users.setAvatar(v);
                } catch (v) {
                    alert("Ошибка загрузки: " + (v.message || "Неизвестная ошибка"));
                } finally{
                    s(!1), a.current && (a.current.value = "");
                }
            }
        };
        return jsxRuntimeExports.jsxs("div", {
            className: "profile-modal__avatar-section",
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: `profile-modal__avatar ${i ? "profile-modal__avatar--uploading" : ""}`,
                    onClick: o,
                    title: "Нажмите чтобы сменить фото",
                    children: [
                        t ? jsxRuntimeExports.jsx("img", {
                            src: t,
                            alt: "Аватар",
                            className: "profile-modal__avatar-img"
                        }) : jsxRuntimeExports.jsx(Avatar, {
                            name: e,
                            size: 80
                        }),
                        jsxRuntimeExports.jsx("div", {
                            className: "profile-modal__avatar-overlay",
                            children: i ? "..." : "📷"
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("input", {
                    ref: a,
                    type: "file",
                    accept: "image/*",
                    style: {
                        display: "none"
                    },
                    onChange: h
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "profile-modal__avatar-hint",
                    children: "Нажмите чтобы сменить фото"
                })
            ]
        });
    }, NameSection = ({ initialName: e })=>{
        const [t, r] = reactExports.useState(e), [i, s] = reactExports.useState(!1), [a, o] = reactExports.useState(!1), [h, c] = reactExports.useState(""), u = async ()=>{
            const v = t.trim();
            if (v) {
                s(!0), c(""), o(!1);
                try {
                    await matrixService.users.setDisplayName(v), o(!0), setTimeout(()=>o(!1), 2e3);
                } catch (C) {
                    c(C.message || "Ошибка сохранения");
                } finally{
                    s(!1);
                }
            }
        };
        return jsxRuntimeExports.jsxs("div", {
            className: "profile-modal__section",
            children: [
                jsxRuntimeExports.jsx("label", {
                    className: "profile-modal__label",
                    children: "Имя"
                }),
                jsxRuntimeExports.jsx("input", {
                    className: "profile-modal__input",
                    type: "text",
                    value: t,
                    onChange: (v)=>r(v.target.value),
                    placeholder: "Введите имя",
                    maxLength: 100
                }),
                jsxRuntimeExports.jsx("button", {
                    className: "profile-modal__btn profile-modal__btn--primary",
                    onClick: u,
                    disabled: i || !t.trim(),
                    children: i ? "Сохранение..." : a ? "✓ Сохранено" : "Сохранить имя"
                }),
                h && jsxRuntimeExports.jsx("div", {
                    className: "profile-modal__error",
                    children: h
                })
            ]
        });
    }, PasswordSection = ()=>{
        const [e, t] = reactExports.useState(""), [r, i] = reactExports.useState(""), [s, a] = reactExports.useState(""), [o, h] = reactExports.useState(!1), [c, u] = reactExports.useState(!1), [v, C] = reactExports.useState(""), d = async ()=>{
            if (C(""), u(!1), !e || !r) {
                C("Заполните все поля");
                return;
            }
            if (r !== s) {
                C("Пароли не совпадают");
                return;
            }
            if (r.length < 6) {
                C("Минимум 6 символов");
                return;
            }
            h(!0);
            try {
                await matrixService.admin.changePassword(e, r), u(!0), t(""), i(""), a(""), setTimeout(()=>u(!1), 3e3);
            } catch (S) {
                S.httpStatus === 401 || S.errcode === "M_FORBIDDEN" ? C("Неверный текущий пароль") : C(S.message || "Ошибка смены пароля");
            } finally{
                h(!1);
            }
        };
        return jsxRuntimeExports.jsxs("div", {
            className: "profile-modal__section",
            children: [
                jsxRuntimeExports.jsx("label", {
                    className: "profile-modal__label",
                    children: "Сменить пароль"
                }),
                jsxRuntimeExports.jsx("input", {
                    className: "profile-modal__input",
                    type: "password",
                    value: e,
                    onChange: (S)=>t(S.target.value),
                    placeholder: "Текущий пароль"
                }),
                jsxRuntimeExports.jsx("input", {
                    className: "profile-modal__input",
                    type: "password",
                    value: r,
                    onChange: (S)=>i(S.target.value),
                    placeholder: "Новый пароль"
                }),
                jsxRuntimeExports.jsx("input", {
                    className: "profile-modal__input",
                    type: "password",
                    value: s,
                    onChange: (S)=>a(S.target.value),
                    placeholder: "Повторите новый пароль"
                }),
                jsxRuntimeExports.jsx("button", {
                    className: "profile-modal__btn profile-modal__btn--primary",
                    onClick: d,
                    disabled: o,
                    children: o ? "Сохранение..." : c ? "✓ Пароль изменён" : "Сменить пароль"
                }),
                v && jsxRuntimeExports.jsx("div", {
                    className: "profile-modal__error",
                    children: v
                })
            ]
        });
    }, ProfileModal = ({ onClose: e, onLogout: t })=>{
        const r = matrixService.users.getMyDisplayName(), [i, s] = reactExports.useState(()=>storageGet("uplink_dm_encrypted") === "true");
        reactExports.useEffect(()=>{
            const o = (h)=>{
                h.key === "Escape" && e();
            };
            return window.addEventListener("keydown", o), ()=>window.removeEventListener("keydown", o);
        }, [
            e
        ]);
        const a = ()=>{
            const o = !i;
            s(o), storageSet("uplink_dm_encrypted", String(o));
        };
        return jsxRuntimeExports.jsx("div", {
            className: "profile-modal-overlay",
            onClick: e,
            children: jsxRuntimeExports.jsxs("div", {
                className: "profile-modal",
                onClick: (o)=>o.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__header",
                        children: [
                            jsxRuntimeExports.jsx("span", {
                                className: "profile-modal__title",
                                children: "Настройки профиля"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "profile-modal__close",
                                onClick: e,
                                children: "✕"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsx(AvatarSection, {
                        displayName: r
                    }),
                    jsxRuntimeExports.jsx(NameSection, {
                        initialName: r
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__divider"
                    }),
                    jsxRuntimeExports.jsx(PasswordSection, {}),
                    jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__divider"
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Безопасность"
                            }),
                            jsxRuntimeExports.jsxs("label", {
                                className: "create-modal__toggle-row",
                                onClick: a,
                                children: [
                                    jsxRuntimeExports.jsxs("span", {
                                        className: "create-modal__toggle-label",
                                        children: [
                                            i ? jsxRuntimeExports.jsx(ShieldCheck, {
                                                size: 16
                                            }) : jsxRuntimeExports.jsx(ShieldOff, {
                                                size: 16
                                            }),
                                            "Шифровать новые личные чаты"
                                        ]
                                    }),
                                    jsxRuntimeExports.jsx("div", {
                                        className: `create-modal__toggle ${i ? "create-modal__toggle--on" : ""}`,
                                        children: jsxRuntimeExports.jsx("div", {
                                            className: "create-modal__toggle-knob"
                                        })
                                    })
                                ]
                            }),
                            i ? jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-warning",
                                children: "Новые личные чаты будут зашифрованы. Боты и интеграции в них не работают."
                            }) : jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-hint",
                                children: "Новые личные чаты создаются без шифрования. Можно включить позже в заголовке чата."
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__divider"
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__section",
                        children: jsxRuntimeExports.jsx("button", {
                            className: "profile-modal__btn profile-modal__btn--danger",
                            onClick: t,
                            children: "Выйти из аккаунта"
                        })
                    })
                ]
            })
        });
    }, IncomingCallOverlay = ({ callInfo: e, onAccept: t, onReject: r })=>jsxRuntimeExports.jsx("div", {
            className: "incoming-call-overlay",
            children: jsxRuntimeExports.jsxs("div", {
                className: "incoming-call-overlay__card",
                children: [
                    jsxRuntimeExports.jsx("div", {
                        className: "incoming-call-overlay__title",
                        children: "Входящий звонок"
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "incoming-call-overlay__caller",
                        children: e.callerName
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "incoming-call-overlay__actions",
                        children: [
                            jsxRuntimeExports.jsx("button", {
                                className: "incoming-call-overlay__btn incoming-call-overlay__btn--reject",
                                onClick: r,
                                title: "Отклонить",
                                children: jsxRuntimeExports.jsx(PhoneOff, {
                                    size: 24
                                })
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "incoming-call-overlay__btn incoming-call-overlay__btn--accept",
                                onClick: t,
                                title: "Принять",
                                children: jsxRuntimeExports.jsx(Phone, {
                                    size: 24
                                })
                            })
                        ]
                    })
                ]
            })
        }), OutgoingCallOverlay = ({ calleeName: e, signalState: t, onCancel: r })=>{
        const i = t === "rejected" || t === "no-answer", s = t === "rejected" ? "Отклонено" : t === "no-answer" ? "Нет ответа" : "Вызов...";
        return jsxRuntimeExports.jsx("div", {
            className: "incoming-call-overlay",
            children: jsxRuntimeExports.jsxs("div", {
                className: "incoming-call-overlay__card",
                children: [
                    jsxRuntimeExports.jsx("div", {
                        className: "incoming-call-overlay__title",
                        children: s
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "incoming-call-overlay__caller",
                        children: e
                    }),
                    !i && jsxRuntimeExports.jsx("div", {
                        className: "incoming-call-overlay__actions",
                        children: jsxRuntimeExports.jsx("button", {
                            className: "incoming-call-overlay__btn incoming-call-overlay__btn--reject",
                            onClick: r,
                            title: "Отмена",
                            children: "✕"
                        })
                    })
                ]
            })
        });
    }, CreateSpaceModal = ({ onClose: e, onCreated: t })=>{
        const [r, i] = reactExports.useState(""), [s, a] = reactExports.useState(""), [o, h] = reactExports.useState(!1), [c, u] = reactExports.useState(!1), [v, C] = reactExports.useState(""), d = async ()=>{
            if (r.trim()) {
                u(!0), C("");
                try {
                    await matrixService.rooms.createSpace(r.trim(), s.trim() || void 0, o), t(), e();
                } catch (S) {
                    C(S.message);
                } finally{
                    u(!1);
                }
            }
        };
        return jsxRuntimeExports.jsx("div", {
            className: "profile-modal-overlay",
            onClick: e,
            children: jsxRuntimeExports.jsxs("div", {
                className: "profile-modal",
                onClick: (S)=>S.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__header",
                        children: [
                            jsxRuntimeExports.jsx("span", {
                                className: "profile-modal__title",
                                children: "Создать канал"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "profile-modal__close",
                                onClick: e,
                                children: "✕"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Название канала"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                value: r,
                                onChange: (S)=>i(S.target.value),
                                placeholder: "Например: Разработка",
                                autoFocus: !0,
                                onKeyDown: (S)=>S.key === "Enter" && d()
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Описание (необязательно)"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                value: s,
                                onChange: (S)=>a(S.target.value),
                                placeholder: "О чём этот канал"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsxs("label", {
                                className: "create-modal__toggle-row",
                                onClick: ()=>h(!o),
                                children: [
                                    jsxRuntimeExports.jsxs("span", {
                                        className: "create-modal__toggle-label",
                                        children: [
                                            o ? jsxRuntimeExports.jsx(ShieldCheck, {
                                                size: 16
                                            }) : jsxRuntimeExports.jsx(ShieldOff, {
                                                size: 16
                                            }),
                                            "Сквозное шифрование (E2E)"
                                        ]
                                    }),
                                    jsxRuntimeExports.jsx("div", {
                                        className: `create-modal__toggle ${o ? "create-modal__toggle--on" : ""}`,
                                        children: jsxRuntimeExports.jsx("div", {
                                            className: "create-modal__toggle-knob"
                                        })
                                    })
                                ]
                            }),
                            o ? jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-warning",
                                children: "В зашифрованных комнатах встроенные боты не работают. Шифрование нельзя отключить после создания канала."
                            }) : jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-hint",
                                children: "Сообщения не шифруются. Боты и интеграции работают."
                            })
                        ]
                    }),
                    v && jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__error",
                        children: v
                    }),
                    jsxRuntimeExports.jsx("button", {
                        className: "profile-modal__btn profile-modal__btn--primary",
                        onClick: d,
                        disabled: c || !r.trim(),
                        children: c ? "Создание..." : "Создать канал"
                    })
                ]
            })
        });
    }, CreateRoomModal = ({ spaceId: e, spaceName: t, onClose: r, onCreated: i })=>{
        const [s, a] = reactExports.useState(""), [o, h] = reactExports.useState(""), [c, u] = reactExports.useState(!1), [v, C] = reactExports.useState(!1), [d, S] = reactExports.useState(""), _ = async ()=>{
            if (s.trim()) {
                C(!0), S("");
                try {
                    await matrixService.rooms.createRoomInSpace(e, s.trim(), o.trim() || void 0, c), i(), r();
                } catch (g) {
                    S(g.message);
                } finally{
                    C(!1);
                }
            }
        };
        return jsxRuntimeExports.jsx("div", {
            className: "profile-modal-overlay",
            onClick: r,
            children: jsxRuntimeExports.jsxs("div", {
                className: "profile-modal",
                onClick: (g)=>g.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__header",
                        children: [
                            jsxRuntimeExports.jsxs("span", {
                                className: "profile-modal__title",
                                children: [
                                    "Создать комнату в ",
                                    t
                                ]
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "profile-modal__close",
                                onClick: r,
                                children: "✕"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Название комнаты"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                value: s,
                                onChange: (g)=>a(g.target.value),
                                placeholder: "Например: общее",
                                autoFocus: !0,
                                onKeyDown: (g)=>g.key === "Enter" && _()
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Описание (необязательно)"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                value: o,
                                onChange: (g)=>h(g.target.value),
                                placeholder: "О чём эта комната"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsxs("label", {
                                className: "create-modal__toggle-row",
                                onClick: ()=>u(!c),
                                children: [
                                    jsxRuntimeExports.jsxs("span", {
                                        className: "create-modal__toggle-label",
                                        children: [
                                            c ? jsxRuntimeExports.jsx(ShieldCheck, {
                                                size: 16
                                            }) : jsxRuntimeExports.jsx(ShieldOff, {
                                                size: 16
                                            }),
                                            "Сквозное шифрование (E2E)"
                                        ]
                                    }),
                                    jsxRuntimeExports.jsx("div", {
                                        className: `create-modal__toggle ${c ? "create-modal__toggle--on" : ""}`,
                                        children: jsxRuntimeExports.jsx("div", {
                                            className: "create-modal__toggle-knob"
                                        })
                                    })
                                ]
                            }),
                            c ? jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-warning",
                                children: "В зашифрованных комнатах встроенные боты не работают. Шифрование нельзя отключить после создания комнаты."
                            }) : jsxRuntimeExports.jsx("div", {
                                className: "create-modal__toggle-hint",
                                children: "Сообщения не шифруются. Боты и интеграции работают."
                            })
                        ]
                    }),
                    d && jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__error",
                        children: d
                    }),
                    jsxRuntimeExports.jsx("button", {
                        className: "profile-modal__btn profile-modal__btn--primary",
                        onClick: _,
                        disabled: v || !s.trim(),
                        children: v ? "Создание..." : "Создать комнату"
                    })
                ]
            })
        });
    }, AdminPanel = ({ onClose: e })=>{
        const [t, r] = reactExports.useState([]), [i, s] = reactExports.useState(!0), [a, o] = reactExports.useState(""), [h, c] = reactExports.useState(""), [u, v] = reactExports.useState(""), [C, d] = reactExports.useState(""), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState(""), [x, E] = reactExports.useState(""), [y, b] = reactExports.useState(null), w = async ()=>{
            s(!0), o("");
            try {
                const B = await matrixService.admin.listServerUsers();
                r(B);
            } catch (B) {
                o(B.message);
            } finally{
                s(!1);
            }
        };
        reactExports.useEffect(()=>{
            w();
        }, []), reactExports.useEffect(()=>{
            const B = (G)=>{
                G.key === "Escape" && e();
            };
            return window.addEventListener("keydown", B), ()=>window.removeEventListener("keydown", B);
        }, [
            e
        ]);
        const j = async ()=>{
            const B = h.trim(), G = C.trim();
            if (!(!B || !G)) {
                _(!0), T(""), E("");
                try {
                    await matrixService.admin.createUser(B, G, u.trim() || void 0), E(`Пользователь ${B} создан`), c(""), v(""), d(""), await w(), setTimeout(()=>E(""), 3e3);
                } catch (V) {
                    T(V.message || "Ошибка создания пользователя");
                } finally{
                    _(!1);
                }
            }
        }, M = async (B, G)=>{
            try {
                await matrixService.admin.setUserAdmin(B, !G), await w();
            } catch (V) {
                o(V.message || "Ошибка изменения роли");
            }
        }, I = async (B)=>{
            try {
                await matrixService.admin.deactivateUser(B), b(null), await w();
            } catch (G) {
                o(G.message || "Ошибка блокировки"), b(null);
            }
        }, D = matrixService.getUserId();
        return jsxRuntimeExports.jsx("div", {
            className: "profile-modal-overlay",
            onClick: e,
            children: jsxRuntimeExports.jsxs("div", {
                className: "profile-modal admin-panel",
                onClick: (B)=>B.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__header",
                        children: [
                            jsxRuntimeExports.jsx("span", {
                                className: "profile-modal__title",
                                children: "Управление пользователями"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "profile-modal__close",
                                onClick: e,
                                children: "✕"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Новый пользователь"
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                placeholder: "Логин (латиница)",
                                value: h,
                                onChange: (B)=>c(B.target.value)
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                placeholder: "Отображаемое имя",
                                value: u,
                                onChange: (B)=>v(B.target.value)
                            }),
                            jsxRuntimeExports.jsx("input", {
                                className: "profile-modal__input",
                                type: "password",
                                placeholder: "Пароль",
                                value: C,
                                onChange: (B)=>d(B.target.value)
                            }),
                            g && jsxRuntimeExports.jsx("div", {
                                className: "profile-modal__error",
                                children: g
                            }),
                            x && jsxRuntimeExports.jsx("div", {
                                className: "admin-panel__success",
                                children: x
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "profile-modal__btn profile-modal__btn--primary",
                                onClick: j,
                                disabled: S || !h.trim() || !C.trim(),
                                children: S ? "Создание..." : "Создать пользователя"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "profile-modal__divider"
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "profile-modal__section",
                        children: [
                            jsxRuntimeExports.jsx("label", {
                                className: "profile-modal__label",
                                children: "Пользователи на сервере"
                            }),
                            i && jsxRuntimeExports.jsx("div", {
                                className: "admin-panel__loading",
                                children: "Загрузка..."
                            }),
                            a && jsxRuntimeExports.jsx("div", {
                                className: "profile-modal__error",
                                children: a
                            }),
                            jsxRuntimeExports.jsx("div", {
                                className: "admin-panel__user-list",
                                children: t.map((B)=>jsxRuntimeExports.jsx(AdminUserRow, {
                                        user: B,
                                        currentUserId: D,
                                        onToggleAdmin: ()=>M(B.userId, B.isAdmin),
                                        onDeactivate: ()=>b(B.userId)
                                    }, B.userId))
                            })
                        ]
                    }),
                    y && jsxRuntimeExports.jsx("div", {
                        className: "admin-panel__confirm-overlay",
                        children: jsxRuntimeExports.jsxs("div", {
                            className: "admin-panel__confirm",
                            children: [
                                jsxRuntimeExports.jsxs("p", {
                                    children: [
                                        "Заблокировать ",
                                        jsxRuntimeExports.jsx("strong", {
                                            children: y
                                        }),
                                        "?"
                                    ]
                                }),
                                jsxRuntimeExports.jsx("p", {
                                    className: "admin-panel__confirm-warning",
                                    children: "Это действие необратимо. Пользователь не сможет войти."
                                }),
                                jsxRuntimeExports.jsxs("div", {
                                    className: "admin-panel__confirm-actions",
                                    children: [
                                        jsxRuntimeExports.jsx("button", {
                                            className: "profile-modal__btn profile-modal__btn--danger",
                                            onClick: ()=>I(y),
                                            children: "Заблокировать"
                                        }),
                                        jsxRuntimeExports.jsx("button", {
                                            className: "profile-modal__btn admin-panel__confirm-cancel",
                                            onClick: ()=>b(null),
                                            children: "Отмена"
                                        })
                                    ]
                                })
                            ]
                        })
                    })
                ]
            })
        });
    }, AdminUserRow = ({ user: e, currentUserId: t, onToggleAdmin: r, onDeactivate: i })=>{
        const s = e.userId === t;
        return jsxRuntimeExports.jsxs("div", {
            className: `admin-panel__user ${e.deactivated ? "admin-panel__user--deactivated" : ""}`,
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "admin-panel__user-info",
                    children: [
                        jsxRuntimeExports.jsx(Avatar, {
                            name: e.displayName,
                            size: 28,
                            imageUrl: e.avatarUrl
                        }),
                        jsxRuntimeExports.jsxs("div", {
                            className: "admin-panel__user-details",
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "admin-panel__user-name",
                                    children: e.displayName
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "admin-panel__user-id",
                                    children: e.userId
                                })
                            ]
                        }),
                        e.isAdmin && jsxRuntimeExports.jsx("span", {
                            className: "admin-panel__badge admin-panel__badge--admin",
                            children: "Админ"
                        }),
                        e.deactivated && jsxRuntimeExports.jsx("span", {
                            className: "admin-panel__badge admin-panel__badge--blocked",
                            children: "Заблокирован"
                        })
                    ]
                }),
                !s && !e.deactivated && jsxRuntimeExports.jsxs("div", {
                    className: "admin-panel__user-actions",
                    children: [
                        jsxRuntimeExports.jsx("button", {
                            className: "admin-panel__action-btn",
                            onClick: r,
                            title: e.isAdmin ? "Снять админа" : "Дать админа",
                            children: e.isAdmin ? "👤" : "🛡️"
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "admin-panel__action-btn admin-panel__action-btn--danger",
                            onClick: i,
                            title: "Заблокировать",
                            children: "\\uD83D\\uDEAB"
                        })
                    ]
                })
            ]
        });
    };
    function useThread(e, t) {
        const [r, i] = reactExports.useState([]), [s, a] = reactExports.useState(null), o = reactExports.useCallback(()=>{
            if (!e || !t) {
                i([]), a(null);
                return;
            }
            const c = (g)=>matrixService.users.getDisplayName(g), u = (g)=>matrixService.users.getUserAvatarUrl(g), v = (g, T)=>matrixService.media.mxcToHttp(g, T), C = (g)=>matrixService.media.mxcToHttpDownload(g), d = matrixService.messages.findEventInRoom(e, t);
            if (d) {
                const g = parseEvent(d, c, u, v, C);
                a(g);
            }
            const _ = matrixService.threads.getThreadMessages(e, t).map((g)=>parseEvent(g, c, u, v, C)).filter((g)=>g !== null);
            i(_);
        }, [
            e,
            t
        ]);
        reactExports.useEffect(()=>{
            if (o(), !e) return;
            const c = matrixService.onThreadUpdate((v, C)=>{
                v === e && C === t && o();
            }), u = matrixService.onNewMessage((v)=>{
                v === e && o();
            });
            return ()=>{
                c(), u();
            };
        }, [
            e,
            t,
            o
        ]);
        const h = reactExports.useCallback(async (c)=>{
            !e || !t || !c.trim() || await matrixService.threads.sendThreadMessage(e, t, c.trim());
        }, [
            e,
            t
        ]);
        return {
            rootMessage: s,
            messages: r,
            sendMessage: h,
            refresh: o
        };
    }
    function formatTime(e) {
        return new Date(e).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }
    function pluralReplies(e) {
        return e % 10 === 1 && e % 100 !== 11 ? "ответ" : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? "ответа" : "ответов";
    }
    const ThreadPanel = ({ roomId: e, threadRootId: t, onClose: r })=>{
        const { rootMessage: i, messages: s, sendMessage: a } = useThread(e, t), [o, h] = reactExports.useState(""), [c, u] = reactExports.useState(!1), v = reactExports.useRef(null);
        reactExports.useEffect(()=>{
            v.current?.scrollIntoView({
                behavior: "smooth"
            });
        }, [
            s.length
        ]), reactExports.useEffect(()=>{
            h("");
        }, [
            t
        ]);
        const C = async ()=>{
            if (!(!o.trim() || c)) {
                u(!0);
                try {
                    await a(o.trim()), h("");
                } finally{
                    u(!1);
                }
            }
        }, d = (S)=>{
            S.key === "Enter" && !S.shiftKey && (S.preventDefault(), C());
        };
        return jsxRuntimeExports.jsxs("div", {
            className: "thread-panel",
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "thread-panel__header",
                    children: [
                        jsxRuntimeExports.jsx("span", {
                            className: "thread-panel__title",
                            children: "Тред"
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "thread-panel__close",
                            onClick: r,
                            children: jsxRuntimeExports.jsx(X, {
                                size: 18
                            })
                        })
                    ]
                }),
                i && jsxRuntimeExports.jsxs("div", {
                    className: "thread-panel__root",
                    children: [
                        jsxRuntimeExports.jsxs("div", {
                            className: "thread-panel__root-header",
                            children: [
                                jsxRuntimeExports.jsx(Avatar, {
                                    name: i.senderDisplayName,
                                    size: 24,
                                    imageUrl: i.senderAvatarUrl
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "thread-panel__root-sender",
                                    children: i.senderDisplayName
                                }),
                                jsxRuntimeExports.jsx("span", {
                                    className: "thread-panel__root-time",
                                    children: formatTime(i.timestamp)
                                })
                            ]
                        }),
                        jsxRuntimeExports.jsx("div", {
                            className: "thread-panel__root-body",
                            dangerouslySetInnerHTML: {
                                __html: renderMarkdown(i.body)
                            }
                        })
                    ]
                }),
                jsxRuntimeExports.jsx("div", {
                    className: "thread-panel__divider",
                    children: jsxRuntimeExports.jsxs("span", {
                        children: [
                            s.length,
                            " ",
                            pluralReplies(s.length)
                        ]
                    })
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "thread-panel__messages",
                    children: [
                        s.map((S)=>jsxRuntimeExports.jsxs("div", {
                                className: "thread-panel__message",
                                children: [
                                    jsxRuntimeExports.jsx(Avatar, {
                                        name: S.senderDisplayName,
                                        size: 24,
                                        imageUrl: S.senderAvatarUrl
                                    }),
                                    jsxRuntimeExports.jsxs("div", {
                                        className: "thread-panel__message-content",
                                        children: [
                                            jsxRuntimeExports.jsxs("div", {
                                                className: "thread-panel__message-header",
                                                children: [
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: "thread-panel__message-sender",
                                                        children: S.senderDisplayName
                                                    }),
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: "thread-panel__message-time",
                                                        children: formatTime(S.timestamp)
                                                    })
                                                ]
                                            }),
                                            jsxRuntimeExports.jsx("div", {
                                                className: "thread-panel__message-body",
                                                dangerouslySetInnerHTML: {
                                                    __html: renderMarkdown(S.body)
                                                }
                                            })
                                        ]
                                    })
                                ]
                            }, S.id)),
                        jsxRuntimeExports.jsx("div", {
                            ref: v
                        })
                    ]
                }),
                jsxRuntimeExports.jsxs("div", {
                    className: "thread-panel__input",
                    children: [
                        jsxRuntimeExports.jsx("textarea", {
                            className: "thread-panel__textarea",
                            placeholder: "Ответить в тред...",
                            value: o,
                            onChange: (S)=>h(S.target.value),
                            onKeyDown: d,
                            rows: 1
                        }),
                        jsxRuntimeExports.jsx("button", {
                            className: "thread-panel__send",
                            onClick: C,
                            disabled: !o.trim() || c,
                            children: jsxRuntimeExports.jsx(Send, {
                                size: 16
                            })
                        })
                    ]
                })
            ]
        });
    }, BotManagePanel = ({ currentUserId: e, onCreateBot: t })=>{
        const [r, i] = reactExports.useState([]), [s, a] = reactExports.useState(!0), [o, h] = reactExports.useState(null);
        reactExports.useEffect(()=>{
            c();
        }, [
            e
        ]);
        const c = async ()=>{
            try {
                const d = getConfig().botApiUrl, S = await fetch(`${d}/custom-bots?owner=${encodeURIComponent(e)}`);
                S.ok && i(await S.json());
            } catch (d) {
                console.error("Ошибка загрузки кастомных ботов:", d);
            } finally{
                a(!1);
            }
        }, u = async (d)=>{
            try {
                const S = getConfig().botApiUrl;
                await fetch(`${S}/custom-bots/${d}`, {
                    method: "DELETE"
                }), c();
            } catch (S) {
                console.error("Ошибка удаления бота:", S);
            }
        }, v = async (d)=>{
            try {
                const S = getConfig().botApiUrl, _ = await fetch(`${S}/custom-bots/${d}/regenerate-token`, {
                    method: "POST"
                });
                if (_.ok) {
                    const g = await _.json();
                    alert(`Новый токен (сохраните!):

${g.token}`);
                }
            } catch (S) {
                console.error("Ошибка перевыпуска токена:", S);
            }
        }, C = (d)=>new Date(d).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        return s ? jsxRuntimeExports.jsx("div", {
            className: "bot-manage__loading",
            children: "Загрузка..."
        }) : jsxRuntimeExports.jsx("div", {
            className: "bot-manage",
            children: r.length === 0 ? jsxRuntimeExports.jsxs("div", {
                className: "bot-manage__empty",
                children: [
                    jsxRuntimeExports.jsx("p", {
                        children: "У вас пока нет кастомных ботов"
                    }),
                    jsxRuntimeExports.jsx("button", {
                        className: "bot-manage__create-btn",
                        onClick: t,
                        children: "+ Создать бота"
                    })
                ]
            }) : jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                children: [
                    jsxRuntimeExports.jsx("div", {
                        className: "bot-manage__list",
                        children: r.map((d)=>jsxRuntimeExports.jsxs("div", {
                                className: "bot-manage__item",
                                children: [
                                    jsxRuntimeExports.jsxs("div", {
                                        className: "bot-manage__item-header",
                                        onClick: ()=>h(o === d.id ? null : d.id),
                                        children: [
                                            jsxRuntimeExports.jsxs("div", {
                                                className: "bot-manage__item-info",
                                                children: [
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: `bot-manage__status bot-manage__status--${d.status}`
                                                    }),
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: "bot-manage__item-name",
                                                        children: d.name
                                                    }),
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: "bot-manage__item-mode",
                                                        children: d.mode
                                                    })
                                                ]
                                            }),
                                            jsxRuntimeExports.jsx("span", {
                                                className: "bot-manage__expand",
                                                children: o === d.id ? "▾" : "▸"
                                            })
                                        ]
                                    }),
                                    d.description && jsxRuntimeExports.jsx("p", {
                                        className: "bot-manage__item-desc",
                                        children: d.description
                                    }),
                                    o === d.id && jsxRuntimeExports.jsxs("div", {
                                        className: "bot-manage__details",
                                        children: [
                                            d.commands.length > 0 && jsxRuntimeExports.jsxs("div", {
                                                className: "bot-manage__commands",
                                                children: [
                                                    jsxRuntimeExports.jsx("span", {
                                                        className: "bot-manage__label",
                                                        children: "Команды:"
                                                    }),
                                                    d.commands.map((S)=>jsxRuntimeExports.jsxs("div", {
                                                            className: "bot-manage__command",
                                                            children: [
                                                                jsxRuntimeExports.jsx("code", {
                                                                    children: S.command
                                                                }),
                                                                jsxRuntimeExports.jsx("span", {
                                                                    children: S.description
                                                                })
                                                            ]
                                                        }, S.command))
                                                ]
                                            }),
                                            jsxRuntimeExports.jsxs("div", {
                                                className: "bot-manage__meta",
                                                children: [
                                                    jsxRuntimeExports.jsxs("span", {
                                                        children: [
                                                            "Каналов: ",
                                                            d.rooms.length
                                                        ]
                                                    }),
                                                    jsxRuntimeExports.jsxs("span", {
                                                        children: [
                                                            "Создан: ",
                                                            C(d.created)
                                                        ]
                                                    }),
                                                    d.mode === "webhook" && d.webhookUrl && jsxRuntimeExports.jsxs("span", {
                                                        className: "bot-manage__webhook-url",
                                                        title: d.webhookUrl,
                                                        children: [
                                                            "URL: ",
                                                            d.webhookUrl.length > 40 ? d.webhookUrl.slice(0, 40) + "..." : d.webhookUrl
                                                        ]
                                                    })
                                                ]
                                            }),
                                            jsxRuntimeExports.jsxs("div", {
                                                className: "bot-manage__actions",
                                                children: [
                                                    jsxRuntimeExports.jsx("button", {
                                                        className: "bot-manage__action-btn",
                                                        onClick: ()=>v(d.id),
                                                        children: "Перевыпустить токен"
                                                    }),
                                                    jsxRuntimeExports.jsx("button", {
                                                        className: "bot-manage__action-btn bot-manage__action-btn--danger",
                                                        onClick: ()=>u(d.id),
                                                        children: "Удалить"
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }, d.id))
                    }),
                    jsxRuntimeExports.jsx("button", {
                        className: "bot-manage__create-btn",
                        onClick: t,
                        children: "+ Создать бота"
                    })
                ]
            })
        });
    }, BotCreateModal = ({ currentUserId: e, onCreated: t, onClose: r })=>{
        const [i, s] = reactExports.useState(""), [a, o] = reactExports.useState(""), [h, c] = reactExports.useState("sdk"), [u, v] = reactExports.useState(""), [C, d] = reactExports.useState([
            {
                command: "",
                description: ""
            }
        ]), [S, _] = reactExports.useState(!1), [g, T] = reactExports.useState(""), [x, E] = reactExports.useState(null), [y, b] = reactExports.useState(null), w = ()=>{
            d([
                ...C,
                {
                    command: "",
                    description: ""
                }
            ]);
        }, j = (B)=>{
            d(C.filter((G, V)=>V !== B));
        }, M = (B, G, V)=>{
            const U = [
                ...C
            ];
            U[B] = {
                ...U[B],
                [G]: V
            }, d(U);
        }, I = async ()=>{
            if (!i.trim()) {
                T("Введите имя бота");
                return;
            }
            if (h === "webhook" && !u.trim()) {
                T("Введите Webhook URL");
                return;
            }
            _(!0), T("");
            try {
                const B = getConfig().botApiUrl, V = C.filter((z)=>z.command.trim()).map((z)=>({
                        command: z.command.startsWith("/") ? z.command : `/${z.command}`,
                        description: z.description
                    })), U = await fetch(`${B}/custom-bots`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: i.trim(),
                        description: a.trim(),
                        mode: h,
                        webhookUrl: h === "webhook" ? u.trim() : void 0,
                        commands: V,
                        owner: e
                    })
                });
                if (!U.ok) {
                    const z = await U.json();
                    throw new Error(z.error || "Ошибка создания");
                }
                const W = await U.json();
                E(W.token), W.webhookSecret && b(W.webhookSecret);
            } catch (B) {
                T(B instanceof Error ? B.message : "Неизвестная ошибка");
            } finally{
                _(!1);
            }
        }, D = ()=>{
            t(), r();
        };
        return x ? jsxRuntimeExports.jsx("div", {
            className: "bot-modal-overlay",
            onClick: r,
            children: jsxRuntimeExports.jsxs("div", {
                className: "bot-modal",
                onClick: (B)=>B.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsx("div", {
                        className: "bot-modal__header",
                        children: jsxRuntimeExports.jsx("span", {
                            className: "bot-modal__title",
                            children: "Бот создан"
                        })
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "bot-modal__body",
                        children: jsxRuntimeExports.jsxs("div", {
                            className: "bot-modal__success",
                            children: [
                                jsxRuntimeExports.jsxs("p", {
                                    children: [
                                        "Бот ",
                                        jsxRuntimeExports.jsx("strong", {
                                            children: i
                                        }),
                                        " успешно создан."
                                    ]
                                }),
                                jsxRuntimeExports.jsxs("div", {
                                    className: "bot-modal__token-block",
                                    children: [
                                        jsxRuntimeExports.jsx("label", {
                                            children: "Токен (сохраните — показывается один раз):"
                                        }),
                                        jsxRuntimeExports.jsx("code", {
                                            className: "bot-modal__token",
                                            children: x
                                        })
                                    ]
                                }),
                                y && jsxRuntimeExports.jsxs("div", {
                                    className: "bot-modal__token-block",
                                    children: [
                                        jsxRuntimeExports.jsx("label", {
                                            children: "Webhook Secret (для проверки подписи):"
                                        }),
                                        jsxRuntimeExports.jsx("code", {
                                            className: "bot-modal__token",
                                            children: y
                                        })
                                    ]
                                }),
                                h === "sdk" && jsxRuntimeExports.jsxs("div", {
                                    className: "bot-modal__hint",
                                    children: [
                                        jsxRuntimeExports.jsx("p", {
                                            children: "Подключение через SDK:"
                                        }),
                                        jsxRuntimeExports.jsx("pre", {
                                            children: `import { UplinkBot } from '@uplink/bot-sdk';

const bot = new UplinkBot({
    url: '${window.location.origin}',
    token: '${x}',
});

bot.onCommand('/ping', async (ctx) => {
    await ctx.reply('pong!');
});

bot.start();`
                                        })
                                    ]
                                })
                            ]
                        })
                    }),
                    jsxRuntimeExports.jsx("div", {
                        className: "bot-modal__footer",
                        children: jsxRuntimeExports.jsx("button", {
                            className: "bot-modal__btn bot-modal__btn--primary",
                            onClick: D,
                            children: "Готово"
                        })
                    })
                ]
            })
        }) : jsxRuntimeExports.jsx("div", {
            className: "bot-modal-overlay",
            onClick: r,
            children: jsxRuntimeExports.jsxs("div", {
                className: "bot-modal",
                onClick: (B)=>B.stopPropagation(),
                children: [
                    jsxRuntimeExports.jsxs("div", {
                        className: "bot-modal__header",
                        children: [
                            jsxRuntimeExports.jsx("span", {
                                className: "bot-modal__title",
                                children: "Создать бота"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "bot-modal__close",
                                onClick: r,
                                children: "✕"
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "bot-modal__body",
                        children: [
                            g && jsxRuntimeExports.jsx("div", {
                                className: "bot-modal__error",
                                children: g
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "bot-modal__field",
                                children: [
                                    jsxRuntimeExports.jsx("label", {
                                        children: "Имя бота"
                                    }),
                                    jsxRuntimeExports.jsx("input", {
                                        type: "text",
                                        value: i,
                                        onChange: (B)=>s(B.target.value),
                                        placeholder: "Deploy Bot",
                                        autoFocus: !0
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "bot-modal__field",
                                children: [
                                    jsxRuntimeExports.jsx("label", {
                                        children: "Описание"
                                    }),
                                    jsxRuntimeExports.jsx("input", {
                                        type: "text",
                                        value: a,
                                        onChange: (B)=>o(B.target.value),
                                        placeholder: "Автоматизация деплоя"
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "bot-modal__field",
                                children: [
                                    jsxRuntimeExports.jsx("label", {
                                        children: "Режим"
                                    }),
                                    jsxRuntimeExports.jsxs("div", {
                                        className: "bot-modal__mode-toggle",
                                        children: [
                                            jsxRuntimeExports.jsx("button", {
                                                className: `bot-modal__mode-btn ${h === "sdk" ? "active" : ""}`,
                                                onClick: ()=>c("sdk"),
                                                children: "SDK"
                                            }),
                                            jsxRuntimeExports.jsx("button", {
                                                className: `bot-modal__mode-btn ${h === "webhook" ? "active" : ""}`,
                                                onClick: ()=>c("webhook"),
                                                children: "Webhook"
                                            })
                                        ]
                                    }),
                                    jsxRuntimeExports.jsx("span", {
                                        className: "bot-modal__mode-hint",
                                        children: h === "sdk" ? "Бот подключается через WebSocket (npm-пакет @uplink/bot-sdk)" : "Uplink отправляет HTTP POST на ваш URL"
                                    })
                                ]
                            }),
                            h === "webhook" && jsxRuntimeExports.jsxs("div", {
                                className: "bot-modal__field",
                                children: [
                                    jsxRuntimeExports.jsx("label", {
                                        children: "Webhook URL"
                                    }),
                                    jsxRuntimeExports.jsx("input", {
                                        type: "url",
                                        value: u,
                                        onChange: (B)=>v(B.target.value),
                                        placeholder: "https://my-server.com/bot-hook"
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsxs("div", {
                                className: "bot-modal__field",
                                children: [
                                    jsxRuntimeExports.jsx("label", {
                                        children: "Команды"
                                    }),
                                    C.map((B, G)=>jsxRuntimeExports.jsxs("div", {
                                            className: "bot-modal__command-row",
                                            children: [
                                                jsxRuntimeExports.jsx("input", {
                                                    type: "text",
                                                    value: B.command,
                                                    onChange: (V)=>M(G, "command", V.target.value),
                                                    placeholder: "/команда",
                                                    className: "bot-modal__command-input"
                                                }),
                                                jsxRuntimeExports.jsx("input", {
                                                    type: "text",
                                                    value: B.description,
                                                    onChange: (V)=>M(G, "description", V.target.value),
                                                    placeholder: "Описание",
                                                    className: "bot-modal__command-desc"
                                                }),
                                                C.length > 1 && jsxRuntimeExports.jsx("button", {
                                                    className: "bot-modal__command-remove",
                                                    onClick: ()=>j(G),
                                                    children: "✕"
                                                })
                                            ]
                                        }, G)),
                                    jsxRuntimeExports.jsx("button", {
                                        className: "bot-modal__add-cmd",
                                        onClick: w,
                                        children: "+ Добавить команду"
                                    })
                                ]
                            })
                        ]
                    }),
                    jsxRuntimeExports.jsxs("div", {
                        className: "bot-modal__footer",
                        children: [
                            jsxRuntimeExports.jsx("button", {
                                className: "bot-modal__btn",
                                onClick: r,
                                children: "Отмена"
                            }),
                            jsxRuntimeExports.jsx("button", {
                                className: "bot-modal__btn bot-modal__btn--primary",
                                onClick: I,
                                disabled: S,
                                children: S ? "Создание..." : "Создать"
                            })
                        ]
                    })
                ]
            })
        });
    }, BotSettings = ({ roomId: e, currentUserId: t, onClose: r })=>{
        const [i, s] = reactExports.useState("builtin"), [a, o] = reactExports.useState([]), [h, c] = reactExports.useState(!0), [u, v] = reactExports.useState(!1), [C, d] = reactExports.useState(null);
        reactExports.useEffect(()=>{
            S();
        }, [
            e
        ]);
        const S = async ()=>{
            try {
                const g = getConfig().botApiUrl, T = await fetch(`${g}/bots?roomId=${encodeURIComponent(e)}`);
                T.ok && o(await T.json());
            } catch (g) {
                console.error("Ошибка загрузки ботов:", g);
            } finally{
                c(!1);
            }
        }, _ = async (g, T)=>{
            d(null);
            const x = getConfig().botApiUrl, E = T ? "enable" : "disable";
            try {
                const y = await fetch(`${x}/bots/${g}/${E}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        roomId: e
                    })
                }), b = await y.json();
                y.ok ? b.warning && d(b.warning) : d(`Ошибка: ${b.error || "Не удалось переключить бота"}`), S();
            } catch  {
                d("Ошибка подключения к бот-сервису");
            }
        };
        return jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [
                jsxRuntimeExports.jsxs("div", {
                    className: "bot-settings",
                    children: [
                        jsxRuntimeExports.jsxs("div", {
                            className: "bot-settings__header",
                            children: [
                                jsxRuntimeExports.jsx("span", {
                                    className: "bot-settings__title",
                                    children: "Боты"
                                }),
                                jsxRuntimeExports.jsx("button", {
                                    className: "bot-settings__close",
                                    onClick: r,
                                    children: "✕"
                                })
                            ]
                        }),
                        jsxRuntimeExports.jsxs("div", {
                            className: "bot-settings__tabs",
                            children: [
                                jsxRuntimeExports.jsx("button", {
                                    className: `bot-settings__tab ${i === "builtin" ? "active" : ""}`,
                                    onClick: ()=>s("builtin"),
                                    children: "Встроенные"
                                }),
                                jsxRuntimeExports.jsx("button", {
                                    className: `bot-settings__tab ${i === "custom" ? "active" : ""}`,
                                    onClick: ()=>s("custom"),
                                    children: "Мои боты"
                                })
                            ]
                        }),
                        C && jsxRuntimeExports.jsx("div", {
                            className: "create-modal__toggle-warning",
                            style: {
                                margin: "0 12px 8px"
                            },
                            children: C
                        }),
                        i === "builtin" ? h ? jsxRuntimeExports.jsx("div", {
                            className: "bot-settings__loading",
                            children: "Загрузка..."
                        }) : jsxRuntimeExports.jsx("div", {
                            className: "bot-settings__list",
                            children: a.map((g)=>jsxRuntimeExports.jsxs("div", {
                                    className: "bot-settings__item",
                                    children: [
                                        jsxRuntimeExports.jsxs("div", {
                                            className: "bot-settings__item-header",
                                            children: [
                                                jsxRuntimeExports.jsx("span", {
                                                    className: "bot-settings__item-name",
                                                    children: g.displayName
                                                }),
                                                jsxRuntimeExports.jsxs("label", {
                                                    className: "bot-settings__toggle",
                                                    children: [
                                                        jsxRuntimeExports.jsx("input", {
                                                            type: "checkbox",
                                                            checked: g.enabledInRoom,
                                                            onChange: (T)=>_(g.id, T.target.checked)
                                                        }),
                                                        jsxRuntimeExports.jsx("span", {
                                                            className: "bot-settings__toggle-slider"
                                                        })
                                                    ]
                                                })
                                            ]
                                        }),
                                        jsxRuntimeExports.jsx("p", {
                                            className: "bot-settings__item-desc",
                                            children: g.description
                                        }),
                                        g.enabledInRoom && g.commands.length > 0 && jsxRuntimeExports.jsx("div", {
                                            className: "bot-settings__commands",
                                            children: g.commands.map((T)=>jsxRuntimeExports.jsxs("div", {
                                                    className: "bot-settings__command",
                                                    children: [
                                                        jsxRuntimeExports.jsx("code", {
                                                            children: T.command
                                                        }),
                                                        jsxRuntimeExports.jsx("span", {
                                                            children: T.description
                                                        })
                                                    ]
                                                }, T.command))
                                        })
                                    ]
                                }, g.id))
                        }) : jsxRuntimeExports.jsx(BotManagePanel, {
                            currentUserId: t,
                            onCreateBot: ()=>v(!0)
                        })
                    ]
                }),
                u && jsxRuntimeExports.jsx(BotCreateModal, {
                    currentUserId: t,
                    onCreated: ()=>v(!1),
                    onClose: ()=>v(!1)
                })
            ]
        });
    }, isTauri = typeof window < "u" && "__TAURI_INTERNALS__" in window;
    async function initDeepLinkHandler(e) {
        if (!isTauri) return ()=>{};
        try {
            const { getCurrent: t, onOpenUrl: r } = await __vitePreload(async ()=>{
                const { getCurrent: a, onOpenUrl: o } = await import("./index-DdinnOnw.js");
                return {
                    getCurrent: a,
                    onOpenUrl: o
                };
            }, __vite__mapDeps([2,1]), import.meta.url), i = await t();
            if (i) for (const a of i)processDeepLink(a, e);
            return await r((a)=>{
                for (const o of a)processDeepLink(o, e);
            });
        } catch (t) {
            return console.warn("Deep link init failed:", t), ()=>{};
        }
    }
    function processDeepLink(e, t) {
        try {
            const r = new URL(e);
            if (r.protocol !== "uplink:") return;
            const i = r.hostname + r.pathname;
            if (i.startsWith("room/")) {
                const s = decodeURIComponent(i.slice(5));
                t.onNavigateRoom(s);
                return;
            }
            if (i.startsWith("call/")) {
                const s = decodeURIComponent(i.slice(5));
                t.onStartCall(s);
                return;
            }
            if (r.hostname === "auth") {
                const s = r.searchParams.get("server");
                s && t.onSetServer(s);
                return;
            }
            console.warn("Неизвестный deep link:", e);
        } catch (r) {
            console.error("Ошибка парсинга deep link:", r);
        }
    }
    const ChatLayout = ({ onLogout: e })=>{
        const t = useChatState();
        useViewportResize();
        const { callState: r, participants: i, duration: s, isMuted: a, isCameraOn: o, activeRoomName: h, error: c, joinCall: u, leaveCall: v, toggleMute: C, toggleCamera: d } = useLiveKit(), { signalState: S, callInfo: _, startCall: g, acceptCall: T, rejectCall: x, cancelCall: E, resetSignaling: y } = useCallSignaling();
        reactExports.useEffect(()=>(callSignalingService.startListening(), ()=>callSignalingService.stopListening()), []), reactExports.useEffect(()=>{
            S === "accepted" && _?.direction === "outgoing" && u(_.roomId);
        }, [
            S,
            _,
            u
        ]), reactExports.useEffect(()=>{
            r === "idle" && S === "accepted" && y();
        }, [
            r,
            S,
            y
        ]);
        const b = reactExports.useCallback(()=>{
            t.activeRoom && (t.activeRoom.type === "direct" ? g(t.activeRoom.id, t.activeRoom.name) : u(t.activeRoom.id));
        }, [
            t.activeRoom,
            g,
            u
        ]), w = reactExports.useCallback(async ()=>{
            await T(), _ && u(_.roomId);
        }, [
            T,
            _,
            u
        ]), j = reactExports.useCallback(async ()=>{
            await v(), await callSignalingService.cancelOrHangup();
        }, [
            v
        ]), [M, I] = reactExports.useState(null);
        useVSCodeBridge({
            onNavigateRoom: t.handleSelectRoom,
            onSnippet: (B, G, V, U)=>{
                const W = `\`\`\`${G}
// ${V}:${U}
${B}
\`\`\``;
                I(W);
            },
            onFilePicked: (B, G, V)=>{
                const U = base64ToFile(G, B, V);
                t.sendFile(U);
            },
            onStartCall: b
        }), reactExports.useEffect(()=>{
            let B;
            return initDeepLinkHandler({
                onNavigateRoom: (G)=>t.handleSelectRoom(G),
                onStartCall: (G)=>{
                    t.handleSelectRoom(G), setTimeout(()=>b(), 500);
                },
                onSetServer: (G)=>{
                    storageSet("uplink_preset_server", G);
                }
            }).then((G)=>{
                B = G;
            }), ()=>B?.();
        }, [
            t.handleSelectRoom,
            b
        ]);
        const D = S === "ringing-out" || S === "rejected" || S === "no-answer";
        return jsxRuntimeExports.jsxs("div", {
            className: "chat-layout",
            children: [
                jsxRuntimeExports.jsx("div", {
                    className: `chat-sidebar ${t.mobileView === "chat" ? "chat-sidebar--hidden" : ""}`,
                    children: jsxRuntimeExports.jsx(Sidebar, {
                        spaces: t.spaces,
                        channels: t.channels,
                        directs: t.directs,
                        users: t.users,
                        usersLoading: t.usersLoading,
                        activeRoomId: t.activeRoomId,
                        userName: matrixService.users.getMyDisplayName(),
                        isAdmin: t.isAdmin,
                        onSelectRoom: t.handleSelectRoom,
                        onOpenDM: t.handleOpenDM,
                        onProfileClick: ()=>t.setShowProfile(!0),
                        onLogout: e,
                        onCreateSpace: ()=>t.setShowCreateSpace(!0),
                        onCreateRoom: (B)=>{
                            const G = t.spaces.find((V)=>V.id === B);
                            t.setCreateRoomForSpace({
                                id: B,
                                name: G?.name || ""
                            });
                        },
                        onAdminPanel: ()=>t.setShowAdminPanel(!0)
                    })
                }),
                jsxRuntimeExports.jsx("div", {
                    className: `chat-main ${t.activeThread ? "chat-main--with-thread" : ""}`,
                    children: t.activeRoom ? jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                        children: [
                            jsxRuntimeExports.jsxs("div", {
                                style: {
                                    position: "relative"
                                },
                                children: [
                                    jsxRuntimeExports.jsx(RoomHeader, {
                                        room: t.activeRoom,
                                        onBack: t.handleBack,
                                        callState: r,
                                        activeCallRoomName: h,
                                        onJoinCall: b,
                                        onLeaveCall: j,
                                        pinnedMessages: t.pinnedMessages,
                                        onScrollToMessage: t.setScrollToEventId,
                                        onUnpin: t.togglePin,
                                        showBotSettings: t.showBotSettings,
                                        onToggleBotSettings: ()=>t.setShowBotSettings(!t.showBotSettings)
                                    }),
                                    t.showBotSettings && t.activeRoomId && jsxRuntimeExports.jsx(BotSettings, {
                                        roomId: t.activeRoomId,
                                        currentUserId: matrixService.getUserId(),
                                        onClose: ()=>t.setShowBotSettings(!1)
                                    })
                                ]
                            }),
                            c && jsxRuntimeExports.jsx("div", {
                                className: "call-error",
                                children: c
                            }),
                            r === "connected" && h === t.activeRoom.id && jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                                children: [
                                    jsxRuntimeExports.jsx(CallBar, {
                                        roomName: t.activeRoom.name,
                                        participants: i,
                                        isMuted: a,
                                        isCameraOn: o,
                                        duration: s,
                                        onToggleMute: C,
                                        onToggleCamera: d,
                                        onLeave: j
                                    }),
                                    jsxRuntimeExports.jsx(VideoGrid, {
                                        participants: i
                                    })
                                ]
                            }),
                            jsxRuntimeExports.jsx(MessageList, {
                                messages: t.messages,
                                reactions: t.reactions,
                                pinnedIds: t.pinnedIds,
                                threadSummaries: t.threadSummaries,
                                typingUsers: t.typingUsers,
                                scrollToEventId: t.scrollToEventId,
                                onScrollComplete: ()=>t.setScrollToEventId(null),
                                onLoadMore: t.loadMore,
                                onReply: t.handleReply,
                                onReact: t.sendReaction,
                                onRemoveReaction: t.removeReaction,
                                onPin: t.togglePin,
                                onOpenThread: t.handleOpenThread
                            }),
                            jsxRuntimeExports.jsx(MessageInput, {
                                onSend: t.sendMessage,
                                onSendReply: t.sendReply,
                                onSendFile: t.sendFile,
                                roomId: t.activeRoomId || void 0,
                                roomName: t.activeRoom.name,
                                replyTo: t.replyTo,
                                onCancelReply: ()=>t.setReplyTo(null),
                                pendingText: M,
                                onPendingTextConsumed: ()=>I(null)
                            })
                        ]
                    }) : jsxRuntimeExports.jsx("div", {
                        className: "chat-main__empty",
                        children: "Выберите канал или чат"
                    })
                }),
                t.activeThread && jsxRuntimeExports.jsx(ThreadPanel, {
                    roomId: t.activeThread.roomId,
                    threadRootId: t.activeThread.threadRootId,
                    onClose: ()=>t.setActiveThread(null)
                }),
                D && _ && jsxRuntimeExports.jsx(OutgoingCallOverlay, {
                    calleeName: _.callerName,
                    signalState: S,
                    onCancel: E
                }),
                S === "ringing-in" && _ && jsxRuntimeExports.jsx(IncomingCallOverlay, {
                    callInfo: _,
                    onAccept: w,
                    onReject: x
                }),
                t.showProfile && jsxRuntimeExports.jsx(ProfileModal, {
                    onClose: ()=>t.setShowProfile(!1),
                    onLogout: e
                }),
                t.showCreateSpace && jsxRuntimeExports.jsx(CreateSpaceModal, {
                    onClose: ()=>t.setShowCreateSpace(!1),
                    onCreated: t.refresh
                }),
                t.createRoomForSpace && jsxRuntimeExports.jsx(CreateRoomModal, {
                    spaceId: t.createRoomForSpace.id,
                    spaceName: t.createRoomForSpace.name,
                    onClose: ()=>t.setCreateRoomForSpace(null),
                    onCreated: t.refresh
                }),
                t.showAdminPanel && jsxRuntimeExports.jsx(AdminPanel, {
                    onClose: ()=>t.setShowAdminPanel(!1)
                })
            ]
        });
    }, App = ()=>{
        const { connectionState: e, error: t, login: r, logout: i, restoreSession: s } = useMatrix(), [a, o] = reactExports.useState(!0);
        return reactExports.useEffect(()=>{
            initStorage().then(()=>{
                s().finally(()=>o(!1));
            });
        }, []), a ? jsxRuntimeExports.jsxs("div", {
            className: "uplink-loading",
            children: [
                jsxRuntimeExports.jsx("div", {
                    className: "uplink-loading__spinner"
                }),
                jsxRuntimeExports.jsx("p", {
                    children: "Uplink"
                })
            ]
        }) : e === "disconnected" || e === "error" ? jsxRuntimeExports.jsx(LoginScreen, {
            onLogin: r,
            error: t
        }) : e === "connecting" ? jsxRuntimeExports.jsxs("div", {
            className: "uplink-loading",
            children: [
                jsxRuntimeExports.jsx("div", {
                    className: "uplink-loading__spinner"
                }),
                jsxRuntimeExports.jsx("p", {
                    children: "Подключение..."
                })
            ]
        }) : jsxRuntimeExports.jsx(ChatLayout, {
            onLogout: i
        });
    };
    client.createRoot(document.getElementById("root")).render(jsxRuntimeExports.jsx(React.StrictMode, {
        children: jsxRuntimeExports.jsx(App, {})
    }));
})();
