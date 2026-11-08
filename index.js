(() => {
    const v = window.vendetta || {};
    const { metro, patcher, storage: vStorage } = v;

    const findByStoreName = metro?.findByStoreName;
    const findByProps = metro?.findByProps;
    const common = metro?.common || {};
    const React = common.React || window.React;
    const ReactNative = common.ReactNative || findByProps("ScrollView", "View");
    const { ScrollView, View, Text } = ReactNative || {};

    const Forms = v.ui?.components?.Forms || findByProps("FormRow", "FormSwitchRow");
    const FormRow = Forms?.FormRow;
    const FormSwitchRow = Forms?.FormSwitchRow;
    const FormSection = Forms?.FormSection;
    const FormInput = Forms?.FormInput;

    const storage = (vStorage && vStorage.useProxy) 
        ? vStorage.useProxy(vStorage) 
        : (vStorage || {});

    // Default settings
    if (!storage.badges) {
        storage.badges = {
            EARLY_SUPPORTER: true,
            ACTIVE_DEVELOPER: true,
            BUG_HUNTER_LEVEL_2: false,
            STAFF: false,
            PARTNER: false,
            HYPESQUAD_EVENTS: false,
            BUG_HUNTER_LEVEL_1: false,
            EARLY_VERIFIED_BOT_DEVELOPER: false,
            CERTIFIED_MODERATOR: false,
            HOUSE_BRAVERY: false,
            HOUSE_BRILLIANCE: false,
            HOUSE_BALANCE: false
        };
    }
    if (typeof storage.selfOnly === "undefined") {
        storage.selfOnly = true;
    }
    if (typeof storage.targetUserId === "undefined") {
        storage.targetUserId = "";
    }

    const BADGES = [
        { key: "EARLY_SUPPORTER", label: "Early Supporter (Pig Badge)", flag: 1 << 9 },
        { key: "ACTIVE_DEVELOPER", label: "Active Developer", flag: 1 << 22 },
        { key: "BUG_HUNTER_LEVEL_2", label: "Bug Hunter Level 2 (Gold)", flag: 1 << 14 },
        { key: "BUG_HUNTER_LEVEL_1", label: "Bug Hunter Level 1 (Green)", flag: 1 << 3 },
        { key: "STAFF", label: "Discord Staff", flag: 1 << 0 },
        { key: "PARTNER", label: "Partnered Server Owner", flag: 1 << 1 },
        { key: "HYPESQUAD_EVENTS", label: "HypeSquad Events Coordinator", flag: 1 << 2 },
        { key: "EARLY_VERIFIED_BOT_DEVELOPER", label: "Early Verified Bot Developer", flag: 1 << 17 },
        { key: "CERTIFIED_MODERATOR", label: "Certified Discord Moderator", flag: 1 << 18 },
        { key: "HOUSE_BRAVERY", label: "HypeSquad Bravery", flag: 1 << 6 },
        { key: "HOUSE_BRILLIANCE", label: "HypeSquad Brilliance", flag: 1 << 7 },
        { key: "HOUSE_BALANCE", label: "HypeSquad Balance", flag: 1 << 8 }
    ];

    let unpatches = [];

    function calculateBadgeFlags(existingFlags) {
        let flags = Number(existingFlags) || 0;
        for (const badge of BADGES) {
            if (storage.badges?.[badge.key]) {
                flags |= badge.flag;
            }
        }
        return flags;
    }

    function applyBadgesToUser(user) {
        if (!user || typeof user !== "object") return;
        
        const originalPublicFlags = user.publicFlags ?? user.public_flags ?? 0;
        const newFlags = calculateBadgeFlags(originalPublicFlags);

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
            if (user.public_flags !== undefined) {
                user.public_flags = newFlags;
            }
        }
    }

    function isTargetUser(user, currentUserId) {
        if (!user || !user.id) return false;
        if (storage.targetUserId && storage.targetUserId.trim().length > 0) {
            return user.id === storage.targetUserId.trim();
        }
        if (storage.selfOnly) {
            return user.id === currentUserId;
        }
        return true;
    }

    function onLoad() {
        unpatches = [];
        const UserStore = findByStoreName ? findByStoreName("UserStore") : findByProps("getCurrentUser", "getUser");
        const UserProfileStore = findByStoreName ? findByStoreName("UserProfileStore") : findByProps("getUserProfile");

        if (UserStore && patcher) {
            // Patch getCurrentUser
            unpatches.push(
                patcher.after("getCurrentUser", UserStore, (_, ret) => {
                    if (ret) {
                        applyBadgesToUser(ret);
                    }
                    return ret;
                })
            );

            // Patch getUser
            unpatches.push(
                patcher.after("getUser", UserStore, (args, ret) => {
                    if (ret) {
                        const currentUserId = UserStore.getCurrentUser()?.id;
                        if (isTargetUser(ret, currentUserId)) {
                            applyBadgesToUser(ret);
                        }
                    }
                    return ret;
                })
            );
        }

        if (UserProfileStore && patcher) {
            if (typeof UserProfileStore.getUserProfile === "function") {
                unpatches.push(
                    patcher.after("getUserProfile", UserProfileStore, (args, ret) => {
                        if (ret && ret.user) {
                            const currentUserId = UserStore?.getCurrentUser()?.id;
                            if (isTargetUser(ret.user, currentUserId)) {
                                applyBadgesToUser(ret.user);
                            }
                        }
                        return ret;
                    })
                );
            }
        }
    }

    function onUnload() {
        for (const unpatch of unpatches) {
            try {
                if (typeof unpatch === "function") unpatch();
            } catch (err) {
                console.error("[CustomBadges] Error unpatching:", err);
            }
        }
        unpatches = [];
    }

    function Settings() {
        if (!React) {
            return null;
        }

        const [state, setState] = React.useState({ ...storage.badges });
        const [selfOnly, setSelfOnly] = React.useState(storage.selfOnly);
        const [targetUserId, setTargetUserId] = React.useState(storage.targetUserId || "");

        const toggleBadge = (key) => {
            const next = !state[key];
            const updated = { ...state, [key]: next };
            setState(updated);
            storage.badges = updated;
        };

        const toggleSelfOnly = () => {
            const next = !selfOnly;
            setSelfOnly(next);
            storage.selfOnly = next;
        };

        const onTargetUserChange = (val) => {
            setTargetUserId(val);
            storage.targetUserId = val;
        };

        return React.createElement(
            ScrollView || View,
            { style: { flex: 1, padding: 12 } },
            FormSection ? React.createElement(
                FormSection,
                { title: "Target Options" },
                FormSwitchRow ? React.createElement(FormSwitchRow, {
                    label: "Apply To Self Only",
                    subLabel: "When enabled, badges only apply to your own account",
                    value: selfOnly,
                    onValueChange: toggleSelfOnly
                }) : null,
                FormInput ? React.createElement(FormInput, {
                    title: "Custom Target User ID (Optional)",
                    placeholder: "Leave empty to use current user",
                    value: targetUserId,
                    onChange: onTargetUserChange
                }) : null
            ) : null,
            FormSection ? React.createElement(
                FormSection,
                { title: "Choose Badges To Add / Spoof" },
                BADGES.map(b => (
                    FormSwitchRow ? React.createElement(FormSwitchRow, {
                        key: b.key,
                        label: b.label,
                        value: !!state[b.key],
                        onValueChange: () => toggleBadge(b.key)
                    }) : (
                        FormRow ? React.createElement(FormRow, {
                            key: b.key,
                            label: b.label,
                            subLabel: state[b.key] ? "Enabled" : "Disabled",
                            onPress: () => toggleBadge(b.key)
                        }) : null
                    )
                ))
            ) : null
        );
    }

    const pluginExport = {
        onLoad,
        onUnload,
        settings: Settings
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = pluginExport;
    }
    return pluginExport;
})();
