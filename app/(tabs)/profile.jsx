import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Switch } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";

const profile = {
  name: "Alexis Rivera",
  handle: "@arivera",
  email: "alexis.rivera@example.com",
  phone: "+1 (555) 214-7788",
  location: "Austin, TX",
  memberSince: "Mar 2022",
  tier: "Executive Tier",
  initials: "AR",
};

const tierProgress = {
  current: "Executive",
  next: "Platinum",
  gemsToNext: 7150,
  percent: 68,
};

// Icons come from two different sets (MaterialIcons doesn't have
// everything Material Symbols had) -- this small lookup keeps that
// detail out of the render below.
const STAT_ICONS = {
  token: { set: MaterialIcons, name: "token" },
  diversity_3: { set: MaterialCommunityIcons, name: "account-group" },
  diamond: { set: MaterialIcons, name: "diamond" },
  calendar_month: { set: MaterialCommunityIcons, name: "calendar-month" },
};

function StatIcon({ iconKey, size = 22, color = colors.primary }) {
  const icon = STAT_ICONS[iconKey];
  const IconComponent = icon.set;
  return <IconComponent name={icon.name} size={size} color={color} />;
}

const profileStats = [
  { key: "codes", icon: "token", label: "Codes Purchased", value: "168" },
  { key: "referrals", icon: "diversity_3", label: "Active Referrals", value: "9" },
  { key: "gems", icon: "diamond", label: "GEMS Balance", value: "42,850" },
  { key: "age", icon: "calendar_month", label: "Member Since", value: profile.memberSince },
];

const preferenceToggles = [
  {
    key: "email-updates",
    label: "Email notifications",
    caption: "Purchase receipts, code activity, and balance alerts.",
    defaultOn: true,
  },
  {
    key: "marketing",
    label: "Product announcements",
    caption: "New tiers, packages, and feature releases.",
    defaultOn: false,
  },
  {
    key: "security-alerts",
    label: "Security alerts",
    caption: "Sign-ins from new devices or locations.",
    defaultOn: true,
  },
];

function ToggleRow({ label, caption, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleCaption}>{caption}</Text>
      </View>
      <Switch
        value={on}
        onValueChange={setOn}
        trackColor={{ false: "rgba(26, 33, 28, 0.6)", true: "rgba(89, 222, 155, 0.4)" }}
        thumbColor={on ? colors.primary : colors.onSurfaceVariant}
        ios_backgroundColor="rgba(26, 33, 28, 0.6)"
      />
    </View>
  );
}

export default function ProfilePage() {
  const { logout } = useAuth();

  return (
    <View style={styles.root}>
      {/* Atmosphere glows -- approximated without a true blur filter,
          just large soft-colored circles behind everything. */}
      <View style={[styles.glow, styles.glowTopRight]} />
      <View style={[styles.glow, styles.glowBottomLeft]} />

      <TopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity hero */}
        <View style={[styles.glassPanel, styles.hero]}>
          <View style={styles.heroIdentity}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{profile.initials}</Text>
            </View>
            <View style={styles.heroTextWrap}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.name}</Text>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{profile.tier}</Text>
                </View>
              </View>
              <Text style={styles.handle}>{profile.handle}</Text>
              <View style={styles.metaRow}>
                <MaterialIcons name="email" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{profile.email}</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.editBtn}>
            <MaterialIcons name="edit" size={16} color={colors.onSurface} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Tier progress */}
        <View style={[styles.glassPanel, styles.progressCard]}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressLabel}>Tier Progress</Text>
              <View style={styles.progressTitleRow}>
                <Text style={styles.progressTitle}>{tierProgress.current}</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
                <Text style={styles.progressTitle}>{tierProgress.next}</Text>
              </View>
            </View>
            <View style={styles.progressRemaining}>
              <MaterialIcons name="diamond" size={14} color={colors.primary} />
              <Text style={styles.progressRemainingText}>
                {tierProgress.gemsToNext.toLocaleString()} GEMS to go
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${tierProgress.percent}%` }]} />
          </View>
          <Text style={styles.progressCaption}>
            Reach {tierProgress.next} Tier to unlock priority code drops and higher batch limits.
          </Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsGrid}>
          {profileStats.map((s) => (
            <View style={[styles.glassPanel, styles.statCard]} key={s.key}>
              <View style={styles.statIconWrap}>
                <StatIcon iconKey={s.icon} />
              </View>
              <View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Account details */}
        <View style={[styles.glassPanel, styles.panel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Account Details</Text>
            <Text style={styles.panelSub}>Keep your contact information current.</Text>
          </View>
          <View style={styles.fieldGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.fieldValue}><Text style={styles.fieldValueText}>{profile.name}</Text></View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.fieldValue}><Text style={styles.fieldValueText}>{profile.email}</Text></View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.fieldValue}><Text style={styles.fieldValueText}>{profile.phone}</Text></View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.fieldValue}><Text style={styles.fieldValueText}>{profile.location}</Text></View>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={[styles.glassPanel, styles.panel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Security</Text>
            <Text style={styles.panelSub}>Manage how you sign in and stay protected.</Text>
          </View>

          <View style={styles.securityRow}>
            <View style={styles.securityIcon}>
              <MaterialIcons name="lock" size={18} color={colors.primary} />
            </View>
            <View style={styles.securityInfo}>
              <Text style={styles.securityLabel}>Password</Text>
              <Text style={styles.securityCaption}>Last changed 3 months ago</Text>
            </View>
            <Pressable style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Change</Text>
            </Pressable>
          </View>

          <View style={[styles.securityRow, styles.securityRowBorder]}>
            <View style={styles.securityIcon}>
              <MaterialIcons name="verified-user" size={18} color={colors.primary} />
            </View>
            <View style={styles.securityInfo}>
              <Text style={styles.securityLabel}>Two-Factor Authentication</Text>
              <Text style={styles.securityCaption}>Adds an extra step when signing in</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Enabled</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={[styles.glassPanel, styles.panel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Notification Preferences</Text>
            <Text style={styles.panelSub}>Choose what you hear from us, and how.</Text>
          </View>
          <View>
            {preferenceToggles.map((t, i) => {
              const { key, ...toggleProps } = t;
              return (
                <View key={key} style={i > 0 ? styles.toggleRowBorder : null}>
                  <ToggleRow {...toggleProps} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Danger zone */}
        <View style={[styles.glassPanel, styles.dangerPanel]}>
          <View>
            <Text style={styles.dangerTitle}>Sign out of Gemstone Code</Text>
            <Text style={styles.dangerCaption}>You can always sign back in with your credentials.</Text>
          </View>
          <Pressable style={styles.signoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={16} color={colors.onSurface} />
            <Text style={styles.signoutBtnText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerCopy}>(c) 2024 Gemstone Code. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerLink}>Help Center</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.5,
  },
  glowTopRight: {
    top: 60,
    right: -140,
    backgroundColor: "rgba(0, 168, 107, 0.10)",
  },
  glowBottomLeft: {
    bottom: 120,
    left: -140,
    backgroundColor: "rgba(0, 168, 107, 0.10)",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 20,
  },
  glassPanel: {
    backgroundColor: colors.glassPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  hero: {
    padding: 20,
    gap: 16,
  },
  heroIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onPrimaryContainer,
  },
  heroTextWrap: { flexShrink: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
  },
  tierBadgeText: {
    fontFamily: fonts.hankenBold,
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  handle: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
    alignSelf: "flex-start",
  },
  editBtnText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  progressCard: {
    padding: 20,
    gap: 12,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  progressLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  progressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 17,
    color: colors.onSurface,
  },
  progressRemaining: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressRemainingText: {
    fontFamily: fonts.hankenBold,
    fontSize: 12,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(61, 74, 65, 0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  progressCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 17,
    color: colors.onSurface,
  },
  panel: {
    padding: 20,
    gap: 16,
  },
  panelHeader: { gap: 2 },
  panelTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  panelSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  field: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldValueText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  securityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityInfo: { flex: 1, minWidth: 0 },
  securityLabel: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  securityCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  outlineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtnText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
  },
  statusPillText: {
    fontFamily: fonts.hankenBold,
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 12,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  toggleTextWrap: { flex: 1, minWidth: 0 },
  toggleLabel: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  toggleCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  dangerPanel: {
    padding: 18,
    gap: 14,
  },
  dangerTitle: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  dangerCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  signoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  signoutBtnText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
    gap: 12,
    alignItems: "center",
  },
  footerCopy: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  footerLinks: {
    flexDirection: "row",
    gap: 20,
  },
  footerLink: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.secondary,
  },
});