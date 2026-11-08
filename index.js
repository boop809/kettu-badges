(function(exports, metro, metroCommon, React, ReactNative, plugin, storage, ui, assets, patcher, components) {
    "use strict";

    const { findByStoreName, findByProps } = metro || {};
    const { View, Text, ScrollView } = ReactNative || {};
    const Forms = components?.Forms || (findByProps && findByProps("FormRow", "FormSwitchRow"));
    const TableRowGroup = (findByProps && findByProps("TableRowGroup")?.TableRowGroup) || Forms?.FormSection;
    const TableSwitchRow = (findByProps && findByProps("TableSwitchRow")?.TableSwitchRow) || Forms?.FormSwitchRow;
    const TableRow = (findByProps && findByProps("TableRow")?.TableRow) || Forms?.FormRow;

    const pluginStorage = plugin?.storage || storage?.storage || {};

    const CDN_BASE = "https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges/PNG/";

    const BADGES = [
        { 
            key: "EARLY_SUPPORTER", 
            label: "Early Supporter (Pig Badge)", 
            flag: 1 << 9, 
            id: "early_supporter", 
            desc: "Early Supporter", 
            icon: CDN_BASE + "early_supporter.png" 
        },
        { 
            key: "ACTIVE_DEVELOPER", 
            label: "Active Developer", 
            flag: 1 << 22, 
            id: "active_developer", 
            desc: "Active Developer", 
            icon: CDN_BASE + "active_developer.png" 
        },
        { 
            key: "BUG_HUNTER_LEVEL_2", 
            label: "Bug Hunter Level 2 (Gold)", 
            flag: 1 << 14, 
            id: "bug_hunter_level_2", 
            desc: "Discord Bug Hunter", 
            icon: CDN_BASE + "bug_hunter_level_2.png" 
        },
        { 
            key: "BUG_HUNTER_LEVEL_1", 
            label: "Bug Hunter Level 1 (Green)", 
            flag: 1 << 3, 
            id: "bug_hunter_level_1", 
            desc: "Discord Bug Hunter", 
            icon: CDN_BASE + "bug_hunter_level_1.png" 
        },
        { 
            key: "STAFF", 
            label: "Discord Staff", 
            flag: 1 << 0, 
            id: "staff", 
            desc: "Discord Staff", 
            icon: CDN_BASE + "staff.png" 
        },
        { 
            key: "PARTNER", 
            label: "Partnered Server Owner", 
            flag: 1 << 1, 
            id: "partner", 
            desc: "Discord Partner", 
            icon: CDN_BASE + "partnered_server_owner.png" 
        },
        { 
            key: "HYPESQUAD_EVENTS", 
            label: "HypeSquad Events Coordinator", 
            flag: 1 << 2, 
            id: "hypesquad", 
            desc: "HypeSquad Events", 
            icon: CDN_BASE + "hypesquad_events.png" 
        },
        { 
            key: "EARLY_VERIFIED_BOT_DEVELOPER", 
            label: "Early Verified Bot Developer", 
            flag: 1 << 17, 
            id: "verified_developer", 
            desc: "Early Verified Bot Developer", 
            icon: CDN_BASE + "early_verified_developer.png" 
        },
        { 
            key: "CERTIFIED_MODERATOR", 
            label: "Certified Discord Moderator", 
            flag: 1 << 18, 
            id: "certified_moderator", 
            desc: "Discord Certified Moderator Alumni", 
            icon: CDN_BASE + "certified_moderator.png" 
        },
        { 
            key: "HOUSE_BRAVERY", 
            label: "HypeSquad Bravery", 
            flag: 1 << 6, 
            id: "hypesquad_house_1", 
            desc: "HypeSquad Bravery", 
            icon: CDN_BASE + "hypesquad_bravery.png" 
        },
        { 
            key: "HOUSE_BRILLIANCE", 
            label: "HypeSquad Brilliance", 
            flag: 1 << 7, 
            id: "hypesquad_house_2", 
            desc: "HypeSquad Brilliance", 
            icon: CDN_BASE + "hypesquad_brilliance.png" 
        },
        { 
            key: "HOUSE_BALANCE", 
            label: "HypeSquad Balance", 
            flag: 1 << 8, 
            id: "hypesquad_house_3", 
            desc: "HypeSquad Balance", 
            icon: CDN_BASE + "hypesquad_balance.png" 
        }
    ];

    let unpatches = [];

    function calculateFlags(originalFlags) {
        let flags = Number(originalFlags) || 0;
        for (const b of BADGES) {
            if (pluginStorage[b.key]) {
                flags |= b.flag;
            }
        }
        return flags;
    }

    function applyBadgesToUser(user) {
        if (!user || typeof user !== "object") return;
        const curFlags = user.publicFlags ?? user.public_flags ?? user.flags ?? 0;
        const newFlags = calculateFlags(curFlags);

        try {
            Object.defineProperty(user, "publicFlags", {
                get: () => newFlags,
                set: () => {},
                configurable: true,
                enumerable: true
            });
            Object.defineProperty(user, "public_flags", {
                get: () => newFlags,
                set: () => {},
                configurable: true,
                enumerable: true
            });
            Object.defineProperty(user, "flags", {
                get: () => newFlags,
                set: () => {},
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            user.publicFlags = newFlags;
            user.flags = newFlags;
            if (user.public_flags !== undefined) user.public_flags = newFlags;
        }
    }

    function applyBadgesToProfile(profile) {
        if (!profile || typeof profile !== "object") return;
        
        if (!Array.isArray(profile.badges)) {
            profile.badges = [];
        }

        for (const b of BADGES) {
            if (pluginStorage[b.key]) {
                const alreadyExists = profile.badges.some(x => x && (x.id === b.id || x.description === b.desc));
                if (!alreadyExists) {
                    profile.badges.push({
                        id: b.id,
                        description: b.desc,
                        icon: b.icon,
                        src: b.icon,
                        image: b.icon,
                        url: b.icon,
                        link: "https://discord.com"
                    });
                } else {
                    const existing = profile.badges.find(x => x && (x.id === b.id || x.description === b.desc));
                    if (existing) {
                        existing.icon = b.icon;
                        existing.src = b.icon;
                        existing.image = b.icon;
                    }
                }
            }
        }

        if (profile.user) {
            applyBadgesToUser(profile.user);
        }
    }

    function isTarget(userId, currentUserId) {
        if (!userId) return false;
        if (pluginStorage.targetUserId && pluginStorage.targetUserId.trim().length > 0) {
            return String(userId) === pluginStorage.targetUserId.trim();
        }
        if (pluginStorage.selfOnly) {
            return String(userId) === String(currentUserId);
        }
        return true;
    }

    const pluginDef = {
        onLoad() {
            unpatches = [];
            if (typeof pluginStorage.selfOnly === "undefined") pluginStorage.selfOnly = true;
            if (typeof pluginStorage.EARLY_SUPPORTER === "undefined") pluginStorage.EARLY_SUPPORTER = true;
            if (typeof pluginStorage.ACTIVE_DEVELOPER === "undefined") pluginStorage.ACTIVE_DEVELOPER = true;

            const UserStore = findByStoreName ? findByStoreName("UserStore") : (findByProps && findByProps("getCurrentUser", "getUser"));
            const UserProfileStore = findByStoreName ? findByStoreName("UserProfileStore") : (findByProps && findByProps("getUserProfile"));

            if (UserStore && patcher) {
                unpatches.push(
                    patcher.after("getCurrentUser", UserStore, (_, ret) => {
                        if (ret) applyBadgesToUser(ret);
                        return ret;
                    })
                );
                unpatches.push(
                    patcher.after("getUser", UserStore, (args, ret) => {
                        if (ret) {
                            const curId = UserStore.getCurrentUser()?.id;
                            if (isTarget(ret.id, curId)) applyBadgesToUser(ret);
                        }
                        return ret;
                    })
                );
            }

            if (UserProfileStore && patcher) {
                if (typeof UserProfileStore.getUserProfile === "function") {
                    unpatches.push(
                        patcher.after("getUserProfile", UserProfileStore, (args, ret) => {
                            const curId = UserStore?.getCurrentUser()?.id;
                            const targetId = ret?.userId || ret?.user?.id || args?.[0];
                            if (isTarget(targetId, curId)) {
                                applyBadgesToProfile(ret);
                            }
                            return ret;
                        })
                    );
                }
            }
        },
        onUnload() {
            for (const u of unpatches) {
                try { if (typeof u === "function") u(); } catch (err) {}
            }
            unpatches = [];
        },
        settings() {
            if (storage?.useProxy) storage.useProxy(pluginStorage);
            const [state, setState] = React ? React.useState({ ...pluginStorage }) : [{}, () => {}];

            const toggle = (k) => {
                const next = !pluginStorage[k];
                pluginStorage[k] = next;
                setState({ ...pluginStorage });
            };

            const toggleSelfOnly = () => {
                const next = !pluginStorage.selfOnly;
                pluginStorage.selfOnly = next;
                setState({ ...pluginStorage });
            };

            const Container = TableRowGroup || View;
            const Switch = TableSwitchRow || Forms?.FormSwitchRow;

            if (!React) return null;

            return React.createElement(
                ScrollView || View,
                { style: { flex: 1, padding: 12 } },
                Container ? React.createElement(
                    Container,
                    { title: "Target" },
                    Switch ? React.createElement(Switch, {
                        label: "Apply To Self Only",
                        subLabel: "When on, only your profile shows badges",
                        value: !!state.selfOnly,
                        onValueChange: toggleSelfOnly
                    }) : null
                ) : null,
                Container ? React.createElement(
                    Container,
                    { title: "Badges" },
                    BADGES.map(b => (
                        Switch ? React.createElement(Switch, {
                            key: b.key,
                            label: b.label,
                            value: !!state[b.key],
                            onValueChange: () => toggle(b.key)
                        }) : null
                    ))
                ) : null
            );
        }
    };

    exports.default = pluginDef;
    Object.defineProperty(exports, "__esModule", { value: true });
    return exports;
})({}, vendetta.metro, vendetta.metro.common, window.React, vendetta.metro.common.ReactNative, vendetta.plugin, vendetta.storage, vendetta.ui, vendetta.ui.assets, vendetta.patcher, vendetta.ui.components);
