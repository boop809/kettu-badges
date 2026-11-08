(function(exports, metro, metroCommon, React, ReactNative, plugin, storage, ui, assets, patcher, components) {
    "use strict";

    const { findByStoreName, findByProps, findByName } = metro || {};
    const { View, Text, ScrollView } = ReactNative || {};
    const Forms = components?.Forms || (findByProps && findByProps("FormRow", "FormSwitchRow"));
    const TableRowGroup = (findByProps && findByProps("TableRowGroup")?.TableRowGroup) || Forms?.FormSection;
    const TableSwitchRow = (findByProps && findByProps("TableSwitchRow")?.TableSwitchRow) || Forms?.FormSwitchRow;
    const TableRow = (findByProps && findByProps("TableRow")?.TableRow) || Forms?.FormRow;

    const pluginStorage = plugin?.storage || storage?.storage || {};

    const BADGES = [
        { 
            key: "EARLY_SUPPORTER", 
            label: "Early Supporter", 
            flag: 1 << 9, 
            id: "early_supporter", 
            desc: "Early Supporter", 
            icon: "7060786766c9c840eb3019e725d2b358" 
        },
        { 
            key: "HOUSE_BRAVERY", 
            label: "HypeSquad Bravery", 
            flag: 1 << 6, 
            id: "hypesquad_house_1", 
            desc: "HypeSquad Bravery", 
            icon: "8a88d63823d8a71cd5e390baa45efa02" 
        },
        { 
            key: "HOUSE_BRILLIANCE", 
            label: "HypeSquad Brilliance", 
            flag: 1 << 7, 
            id: "hypesquad_house_2", 
            desc: "HypeSquad Brilliance", 
            icon: "011940fd013da3f7fb926e4a1cd2e618" 
        },
        { 
            key: "HOUSE_BALANCE", 
            label: "HypeSquad Balance", 
            flag: 1 << 8, 
            id: "hypesquad_house_3", 
            desc: "HypeSquad Balance", 
            icon: "3aa41de486fa12454c3761e8e223442e" 
        },
        { 
            key: "BUG_HUNTER_LEVEL_1", 
            label: "Bug Hunter Level 1", 
            flag: 1 << 3, 
            id: "bug_hunter_level_1", 
            desc: "Discord Bug Hunter", 
            icon: "2717692c7dca7289b35297368a940dd0" 
        },
        { 
            key: "BUG_HUNTER_LEVEL_2", 
            label: "Bug Hunter Level 2", 
            flag: 1 << 14, 
            id: "bug_hunter_level_2", 
            desc: "Discord Bug Hunter", 
            icon: "848f79194d4be5ff5f81505cbd0ce1e6" 
        },
        { 
            key: "HYPESQUAD_EVENTS", 
            label: "HypeSquad Events Coordinator", 
            flag: 1 << 2, 
            id: "hypesquad", 
            desc: "HypeSquad Events", 
            icon: "bf01d1073931f921909045f3a39fd264" 
        },
        { 
            key: "EARLY_VERIFIED_BOT_DEVELOPER", 
            label: "Early Verified Bot Developer", 
            flag: 1 << 17, 
            id: "verified_developer", 
            desc: "Early Verified Bot Developer", 
            icon: "6df5892e0f35b051f8b61eace34f4967" 
        },
        { 
            key: "CERTIFIED_MODERATOR", 
            label: "Certified Discord Moderator", 
            flag: 1 << 18, 
            id: "certified_moderator", 
            desc: "Discord Certified Moderator Alumni", 
            icon: "fee1624003e2fee35cb398e125dc479b" 
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

    function getBadgeItem(b) {
        return {
            id: b.id,
            description: b.desc,
            icon: b.icon,
            source: { uri: "https://cdn.discordapp.com/badge-icons/" + b.icon + ".png" }
        };
    }

    const pluginDef = {
        onLoad() {
            unpatches = [];
            if (typeof pluginStorage.selfOnly === "undefined") pluginStorage.selfOnly = true;
            if (typeof pluginStorage.EARLY_SUPPORTER === "undefined") pluginStorage.EARLY_SUPPORTER = true;

            const UserStore = findByStoreName ? findByStoreName("UserStore") : (findByProps && findByProps("getCurrentUser", "getUser"));
            const UserProfileStore = findByStoreName ? findByStoreName("UserProfileStore") : (findByProps && findByProps("getUserProfile"));

            // 1. Hook ProfileBadge component
            const ProfileBadge = (findByName && findByName("ProfileBadge", false)) || (findByProps && findByProps("ProfileBadge"));
            if (ProfileBadge && patcher) {
                const targetFn = typeof ProfileBadge === "function" ? "default" : (ProfileBadge.ProfileBadge ? "ProfileBadge" : "default");
                try {
                    unpatches.push(
                        patcher.before(targetFn, ProfileBadge, (args) => {
                            const props = args[0];
                            if (props?.id) {
                                const matching = BADGES.find(b => b.id === props.id);
                                if (matching) {
                                    props.icon = matching.icon;
                                    props.source = { uri: "https://cdn.discordapp.com/badge-icons/" + matching.icon + ".png" };
                                    props.label = matching.desc;
                                }
                            }
                        })
                    );
                } catch (e) {}
            }

            // 2. Patch useBadges hook (primary badge provider for Discord Mobile)
            const badgeModule = (findByName && findByName("useBadges", false)) || (findByProps && findByProps("useBadges"));
            if (badgeModule && patcher) {
                const fnName = badgeModule.useBadges ? "useBadges" : "default";
                try {
                    unpatches.push(
                        patcher.after(fnName, badgeModule, ([user], result) => {
                            if (!user || !result || !Array.isArray(result)) return result;
                            const curId = UserStore?.getCurrentUser()?.id;
                            const uid = user.userId || user.id;
                            if (isTarget(uid, curId)) {
                                for (const b of BADGES) {
                                    if (pluginStorage[b.key]) {
                                        const idx = result.findIndex(x => x && x.id === b.id);
                                        if (idx === -1) {
                                            result.push(getBadgeItem(b));
                                        } else {
                                            result[idx] = getBadgeItem(b);
                                        }
                                    }
                                }
                            }
                            return result;
                        })
                    );
                } catch (e) {}
            }

            // 3. Patch UserStore to update flags
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

            // 4. Patch UserProfileStore
            if (UserProfileStore && patcher && typeof UserProfileStore.getUserProfile === "function") {
                unpatches.push(
                    patcher.after("getUserProfile", UserProfileStore, (args, ret) => {
                        const curId = UserStore?.getCurrentUser()?.id;
                        const targetId = ret?.userId || ret?.user?.id || args?.[0];
                        if (isTarget(targetId, curId) && ret) {
                            if (!Array.isArray(ret.badges)) ret.badges = [];
                            for (const b of BADGES) {
                                if (pluginStorage[b.key]) {
                                    const idx = ret.badges.findIndex(x => x && x.id === b.id);
                                    if (idx === -1) {
                                        ret.badges.push(getBadgeItem(b));
                                    } else {
                                        ret.badges[idx] = getBadgeItem(b);
                                    }
                                }
                            }
                            if (ret.user) applyBadgesToUser(ret.user);
                        }
                        return ret;
                    })
                );
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
