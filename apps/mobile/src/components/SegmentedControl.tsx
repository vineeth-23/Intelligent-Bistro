import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bot, ReceiptText, Utensils } from "lucide-react-native";

export type ViewMode = "menu" | "assistant" | "cart";

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

const options = [
  { value: "menu" as const, label: "Menu", Icon: Utensils },
  { value: "assistant" as const, label: "AI", Icon: Bot },
  { value: "cart" as const, label: "Cart", Icon: ReceiptText }
];

export function SegmentedControl({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map(({ value: optionValue, label, Icon }) => {
        const selected = value === optionValue;
        return (
          <Pressable
            key={optionValue}
            onPress={() => onChange(optionValue)}
            style={[styles.option, selected && styles.selected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${label}`}
          >
            <Icon size={16} color={selected ? "#FFFFFF" : "#665C52"} strokeWidth={2.4} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 6,
    padding: 5,
    backgroundColor: "#EFE8DE",
    borderRadius: 8
  },
  option: {
    flex: 1,
    minHeight: 40,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6
  },
  selected: {
    backgroundColor: "#22312B"
  },
  label: {
    color: "#665C52",
    fontWeight: "700",
    fontSize: 13
  },
  selectedLabel: {
    color: "#FFFFFF"
  }
});
