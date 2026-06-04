import React from "react";
import { View, StyleSheet, Linking, Platform, Share, Alert } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { getText } from "../i18n";

export default function ShareDialog({ visible, onClose, shareUrl, shareMessage, targetLang }) {
  const lang = targetLang || "zh";
  const t = getText(lang);

  const getShareTargets = () => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareMessage);
    const emailSubject = encodeURIComponent(t.home.shareTitle);
    const emailBody = encodeURIComponent(`${shareMessage}\n${shareUrl}`);

    return [
      {
        key: "wechat",
        label: "Wechat 微信",
        icon: "wechat",
        url: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedUrl}`,
      },
      {
        key: "xiaohongshu",
        label: "Rednote 小红书",
        icon: "book-open-variant",
        url: `https://www.xiaohongshu.com/search_result?keyword=${encodedText}`,
        copyBeforeOpen: true,
      },
      {
        key: "weibo",
        label: "Weibo 微博",
        icon: "sina-weibo",
        url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
      },
      {
        key: "facebook",
        label: "Facebook",
        icon: "facebook",
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        key: "x",
        label: "X / Twitter",
        icon: "twitter",
        url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        icon: "whatsapp",
        url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      },
      {
        key: "email",
        label: "Email",
        icon: "email-outline",
        url: `mailto:?subject=${emailSubject}&body=${emailBody}`,
      },
    ];
  };

  const copyShareTextToClipboard = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
  };

  const openShareUrl = async (url, targetKey) => {
    if (typeof window !== "undefined" && window.location) {
      if (targetKey === "email") {
        window.location.href = url;
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    await Linking.openURL(url);
  };

  const handleShareTargetPress = async (target) => {
    onClose();
    try {
      if (target.copyBeforeOpen) {
        await copyShareTextToClipboard();
      }
      await openShareUrl(target.url, target.key);
    } catch (error) {
      Alert.alert(t.home.shareFailed, error.message || t.home.unknownError);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={styles.shareDialog}>
        <Dialog.Title>{t.home.shareTitle}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.shareSubtitle}>{t.home.shareSubtitle}</Text>
          <View style={styles.shareButtonList}>
            {getShareTargets().map((target) => (
              <Button
                key={target.key}
                mode="outlined"
                icon={target.icon}
                style={styles.shareButton}
                contentStyle={styles.shareButtonContent}
                onPress={() => handleShareTargetPress(target)}
              >
                {target.label}
              </Button>
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>{t.detail.close}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  shareDialog: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  shareSubtitle: {
    color: "#625B71",
    marginBottom: 14,
  },
  shareButtonList: {
    gap: 10,
  },
  shareButton: {
    borderRadius: 14,
  },
  shareButtonContent: {
    height: 46,
    justifyContent: "flex-start",
  },
});
