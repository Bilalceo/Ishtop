/**
 * =============================================================================
 * STUDENT DASHBOARD - Settings Page
 * =============================================================================
 *
 * Features:
 * - Profile settings
 * - Account settings
 * - Notification preferences
 * - Privacy settings
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Bell,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  Camera,
  Save,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { userApi, api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser, changePassword, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const avatarInputRef = useState<HTMLInputElement | null>(null);

  // Form states - initialize from real user data
  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location || "",
    bio: user?.bio || "",
    linkedin: "",
    github: "",
    website: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifications, setNotifications] = useState({
    email_applications: true,
    email_interviews: true,
    email_jobs: true,
    email_tips: false,
    push_applications: true,
    push_messages: true,
  });

  const [privacy, setPrivacy] = useState({
    public_profile: true,
    show_email: false,
    show_phone: false,
  });

  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const allowedTabs = new Set(["profile", "security", "notifications", "privacy"]);
    const applyHashTab = () => {
      const hash = window.location.hash.replace("#", "");
      if (allowedTabs.has(hash)) {
        setActiveTab(hash);
      }
    };

    applyHashTab();
    window.addEventListener("hashchange", applyHashTab);
    return () => window.removeEventListener("hashchange", applyHashTab);
  }, []);

  useEffect(() => {
    api.get("/users/me/notification-preferences")
      .then((res) => res.data?.data && setNotifications(res.data.data))
      .catch(() => {});
    api.get("/users/me/privacy-settings")
      .then((res) => res.data?.data && setPrivacy(res.data.data))
      .catch(() => {});
  }, []);

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      await api.put("/users/me/notification-preferences", notifications);
      toast.success("Bildirishnoma sozlamalari saqlandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true);
    try {
      await api.put("/users/me/privacy-settings", privacy);
      toast.success("Maxfiylik sozlamalari saqlandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUser({
        full_name: profile.full_name,
        phone: profile.phone,
        bio: (profile as any).bio,
        location: (profile as any).location,
      });
      setSaveSuccess(true);
      toast.success(t("settingsPage.saved"));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Yangi parollar mos kelmaydi");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Yangi parol kamida 8 ta belgi bo'lishi kerak");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(passwords.current, passwords.new);
      toast.success("Parol muvaffaqiyatli yangilandi");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await userApi.uploadAvatar(file);
      toast.success("Rasm yangilandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {t("settingsPage.title")}
        </h1>
        <p className="mt-1 text-surface-500">
          {t("settingsPage.subtitle")}
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t("settingsPage.profile")}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              {t("settingsPage.security")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              {t("settingsPage.notifications")}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              {t("settingsPage.privacy")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Avatar Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="relative">
                    <Avatar
                      src={user?.avatar_url}
                      alt={user?.full_name}
                      fallback={user?.full_name?.charAt(0)}
                      size="xl"
                    />
                    <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="font-display text-lg font-semibold text-surface-900">
                      {t("settingsPage.profilePhoto")}
                    </h3>
                    <p className="mt-1 text-sm text-surface-500">
                      {t("settingsPage.photoDescription")}
                    </p>
                    <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1 rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50">
                          {t("settingsPage.uploadPhoto")}
                        </span>
                        <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="full_name">{t("settingsPage.fullName")}</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, full_name: e.target.value }))
                      }
                      icon={<User className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("settingsPage.emailAddress")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, email: e.target.value }))
                      }
                      icon={<Mail className="h-4 w-4" />}
                      disabled
                    />
                    <p className="mt-1 text-xs text-surface-500">
                      {t("settingsPage.contactSupport")}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("settingsPage.phoneNumber")}</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, phone: e.target.value }))
                      }
                      icon={<Phone className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">{t("settingsPage.location")}</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, location: e.target.value }))
                      }
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">{t("settingsPage.bio")}</Label>
                  <textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, bio: e.target.value }))
                    }
                    className="w-full rounded-lg border border-surface-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    rows={3}
                    placeholder={t("settingsPage.bioPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.socialLinks")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="linkedin">{t("settingsPage.linkedin")}</Label>
                    <Input
                      id="linkedin"
                      value={profile.linkedin}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, linkedin: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">{t("settingsPage.github")}</Label>
                    <Input
                      id="github"
                      value={profile.github}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, github: e.target.value }))
                      }
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="website">{t("settingsPage.website")}</Label>
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, website: e.target.value }))
                      }
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline">{t("settingsPage.cancel")}</Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-gradient-to-r from-brand-500 to-violet-600 gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("settingsPage.saving")}
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t("settingsPage.saved")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t("settingsPage.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.changePassword")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current_password">{t("settingsPage.currentPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, current: e.target.value }))
                      }
                      icon={<Lock className="h-4 w-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_password">{t("settingsPage.newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, new: e.target.value }))
                      }
                      icon={<Lock className="h-4 w-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">{t("settingsPage.confirmPassword")}</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, confirm: e.target.value }))
                    }
                    icon={<Lock className="h-4 w-4" />}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !passwords.current || !passwords.new}
                  className="bg-gradient-to-r from-brand-500 to-violet-600"
                >
                  {isChangingPassword ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  ) : null}
                  {t("settingsPage.updatePassword")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.twoFactor")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-900">
                      {t("settingsPage.twoFactorDesc")}
                    </p>
                    <p className="mt-1 text-sm text-surface-500">
                      {t("settingsPage.twoFactorSubDesc")}
                    </p>
                  </div>
                  <Button variant="outline">{t("settingsPage.enable")}</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">{t("settingsPage.dangerZone")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-900">{t("settingsPage.deleteAccount")}</p>
                    <p className="mt-1 text-sm text-surface-500">
                      {t("settingsPage.deleteAccountDesc")}
                    </p>
                  </div>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("settingsPage.deleteAccount")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.emailNotifications")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "email_applications",
                    labelKey: "settingsPage.applicationUpdates",
                    descKey: "settingsPage.applicationUpdatesDesc",
                  },
                  {
                    key: "email_interviews",
                    labelKey: "settingsPage.interviewReminders",
                    descKey: "settingsPage.interviewRemindersDesc",
                  },
                  {
                    key: "email_jobs",
                    labelKey: "settingsPage.newJobMatches",
                    descKey: "settingsPage.newJobMatchesDesc",
                  },
                  {
                    key: "email_tips",
                    labelKey: "settingsPage.careerTips",
                    descKey: "settingsPage.careerTipsDesc",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between border-b border-surface-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-surface-900">{t(item.labelKey)}</p>
                      <p className="text-sm text-surface-500">{t(item.descKey)}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications((n) => ({
                            ...n,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-surface-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-brand-300"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.pushNotifications")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "push_applications",
                    labelKey: "settingsPage.applicationUpdates",
                    descKey: "settingsPage.realTimeUpdates",
                  },
                  {
                    key: "push_messages",
                    labelKey: "settingsPage.messages",
                    descKey: "settingsPage.messagesDesc",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between border-b border-surface-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-surface-900">{t(item.labelKey)}</p>
                      <p className="text-sm text-surface-500">{t(item.descKey)}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications((n) => ({
                            ...n,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-surface-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-brand-300"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Notifications Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveNotifications}
                disabled={isSavingNotifications}
                className="bg-gradient-to-r from-brand-500 to-violet-600 gap-2"
              >
                {isSavingNotifications ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Saqlash
              </Button>
            </div>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.profileVisibility")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "public_profile", label: t("settingsPage.publicProfile"), desc: t("settingsPage.publicProfileDesc") },
                  { key: "show_email", label: t("settingsPage.showEmail"), desc: t("settingsPage.showEmailDesc") },
                  { key: "show_phone", label: t("settingsPage.showPhone"), desc: t("settingsPage.showPhoneDesc") },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between border-b border-surface-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-surface-900">{item.label}</p>
                      <p className="text-sm text-surface-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={privacy[item.key as keyof typeof privacy]}
                        onChange={(e) => setPrivacy((p) => ({ ...p, [item.key]: e.target.checked }))}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-surface-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-brand-300"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settingsPage.dataPrivacy")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-900">{t("settingsPage.downloadData")}</p>
                    <p className="text-sm text-surface-500">
                      {t("settingsPage.downloadDataDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("settingsPage.download")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSavePrivacy}
                disabled={isSavingPrivacy}
                className="bg-gradient-to-r from-brand-500 to-violet-600 gap-2"
              >
                {isSavingPrivacy ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Saqlash
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
