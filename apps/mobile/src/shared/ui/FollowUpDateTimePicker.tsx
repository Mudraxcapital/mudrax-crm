import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

/**
 * Follow-up datetime picker.
 * Android: imperative DateTimePickerAndroid (date → time) — avoids the
 * "Cannot read property 'dismiss' of undefined" crash from remounting the
 * declarative picker while the native dialog is still closing.
 * iOS: declarative spinner.
 */
export function FollowUpDateTimePicker({
  value,
  onConfirm,
  onCancel,
}: {
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}) {
  const valueRef = useRef(value);
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  valueRef.current = value;
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let cancelled = false;

    const openTime = (base: Date) => {
      DateTimePickerAndroid.open({
        value: base,
        mode: "time",
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (cancelled) return;
          if (event.type !== "set" || !date) {
            onCancelRef.current();
            return;
          }
          const next = new Date(base);
          next.setHours(date.getHours(), date.getMinutes(), 0, 0);
          onConfirmRef.current(next);
        },
      });
    };

    DateTimePickerAndroid.open({
      value: valueRef.current,
      mode: "date",
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (cancelled) return;
        if (event.type !== "set" || !date) {
          onCancelRef.current();
          return;
        }
        const next = new Date(valueRef.current);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        // Defer time picker so the date dialog can finish dismissing cleanly.
        setTimeout(() => {
          if (!cancelled) openTime(next);
        }, 250);
      },
    });

    return () => {
      cancelled = true;
      // Do not call DateTimePickerAndroid.dismiss here — in Expo Go the native
      // picker module can be undefined and throws "Cannot read property 'dismiss'".
    };
  }, []);

  if (Platform.OS === "android") {
    // Imperative dialog only — nothing to render.
    return <View />;
  }

  return (
    <DateTimePicker
      value={value}
      mode="datetime"
      display="spinner"
      onChange={(event: DateTimePickerEvent, date?: Date) => {
        if (event.type === "dismissed") {
          onCancel();
          return;
        }
        if (date) onConfirm(date);
      }}
    />
  );
}
