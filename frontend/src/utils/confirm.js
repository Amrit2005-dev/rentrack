import { Alert, Platform } from 'react-native';

/**
 * A destructive yes/no, on whichever platform is asking.
 *
 * React Native's Alert has no web implementation — it resolves to nothing at
 * all there, so a delete guarded by it would silently do nothing in the
 * browser. Every screen that deletes something was writing this same branch by
 * hand; this is that branch, once.
 *
 * @param {object} options
 * @param {string} options.title    What is about to happen.
 * @param {string} options.message  The consequence, in full.
 * @param {string} [options.confirmLabel]
 * @param {() => void} options.onConfirm Runs only on an explicit yes.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
}) {
  if (Platform.OS === 'web') {
    // confirm() is absent in some embedded webviews; treat that as "no".
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
