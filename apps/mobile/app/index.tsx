import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MENU_ITEMS,
  calculateUnitPrice,
  type CartAction,
  type CartItem,
  type MenuCategory,
  type MenuItem,
  type Order
} from "@intelligent-bistro/shared";
import {
  Bot,
  Check,
  ClipboardCheck,
  Clock,
  Minus,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  X
} from "lucide-react-native";
import { SegmentedControl, type ViewMode } from "@/components/SegmentedControl";
import { submitAssistantMessage, submitOrder, type PendingClarification } from "@/lib/api";
import { money } from "@/lib/format";
import { useCartStore } from "@/store/cartStore";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CustomizerMode =
  | {
      type: "add";
      cartItemId: null;
    }
  | {
      type: "edit";
      cartItemId: string;
    };

const categories: { id: MenuCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chef-specials", label: "Chef" },
  { id: "sandwiches", label: "Sandwiches" },
  { id: "bowls", label: "Bowls" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "desserts", label: "Dessert" }
];

const suggestions = [
  "Add two spicy chicken sandwiches and a large water",
  "Make my fries extra crispy",
  "Remove the water",
  "Clear my cart"
];

const pickupOptions = ["ASAP", "6:15 PM", "6:45 PM", "7:15 PM"];

export default function BistroHome() {
  const [mode, setMode] = useState<ViewMode>("menu");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [customizerMode, setCustomizerMode] = useState<CustomizerMode>({
    type: "add",
    cartItemId: null
  });
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftVariantId, setDraftVariantId] = useState<string | null>(null);
  const [draftModifierIds, setDraftModifierIds] = useState<string[]>([]);
  const [draftInstructions, setDraftInstructions] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [guestName, setGuestName] = useState("");
  const [pickupWindow, setPickupWindow] = useState(pickupOptions[0]);
  const [orderNotes, setOrderNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I can build your order from plain English. Try asking for a spicy sandwich, drinks, sides, or cart changes."
    }
  ]);
  const [pendingClarification, setPendingClarification] =
    useState<PendingClarification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cart = useCartStore((state) => state.cart);
  const applyAction = useCartStore((state) => state.applyAction);
  const applyActions = useCartStore((state) => state.applyActions);
  const clearCart = useCartStore((state) => state.clearCart);

  const visibleMenu = useMemo(
    () => MENU_ITEMS.filter((item) => category === "all" || item.category === category),
    [category]
  );

  const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  const draftUnitPrice = selectedItem
    ? calculateUnitPrice(selectedItem, draftVariantId, draftModifierIds)
    : 0;

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message: string, pattern: number | number[] = 12) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    if (Platform.OS !== "web") Vibration.vibrate(pattern);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const openCustomizer = (item: MenuItem) => {
    notify(`Customizing ${item.name}`);
    setSelectedItem(item);
    setCustomizerMode({ type: "add", cartItemId: null });
    setDraftQuantity(1);
    setDraftVariantId(item.variants[0]?.id ?? null);
    setDraftModifierIds([]);
    setDraftInstructions("");
  };

  const openCartEditor = (cartItem: CartItem) => {
    const menuItem = MENU_ITEMS.find((item) => item.id === cartItem.menuItemId);
    if (!menuItem) return;

    notify(`Editing ${cartItem.name}`);
    setSelectedItem(menuItem);
    setCustomizerMode({ type: "edit", cartItemId: cartItem.id });
    setDraftQuantity(cartItem.quantity);
    setDraftVariantId(cartItem.variantId ?? menuItem.variants[0]?.id ?? null);
    setDraftModifierIds(cartItem.modifierIds);
    setDraftInstructions(cartItem.specialInstructions ?? "");
  };

  const toggleModifier = (modifierId: string) => {
    setDraftModifierIds((current) =>
      current.includes(modifierId)
        ? current.filter((id) => id !== modifierId)
        : [...current, modifierId]
    );
  };

  const saveCustomizedItem = () => {
    if (!selectedItem) return;

    if (customizerMode.type === "edit") {
      applyAction({
        type: "UPDATE_QUANTITY",
        cartItemId: customizerMode.cartItemId,
        menuItemId: null,
        quantity: draftQuantity
      });
      applyAction({
        type: "UPDATE_MODIFIERS",
        cartItemId: customizerMode.cartItemId,
        menuItemId: selectedItem.id,
        variantId: draftVariantId,
        modifierIds: draftModifierIds,
        specialInstructions: draftInstructions.trim() || null
      });
    } else {
      applyAction({
        type: "ADD_ITEM",
        menuItemId: selectedItem.id,
        quantity: draftQuantity,
        variantId: draftVariantId,
        modifierIds: draftModifierIds,
        specialInstructions: draftInstructions.trim() || null
      });
    }

    setSelectedItem(null);
    setMode("cart");
    notify(customizerMode.type === "edit" ? "Cart item updated" : "Added to cart");
  };

  const openCheckout = () => {
    if (cart.items.length === 0) return;
    notify("Reviewing checkout");
    setOrderConfirmed(false);
    setCheckoutOpen(true);
  };

  const placeOrder = async () => {
    if (cart.items.length === 0 || placingOrder) return;

    setPlacingOrder(true);
    try {
      const order = await submitOrder({
        cart,
        guestName: guestName.trim() || null,
        pickupWindow,
        orderNotes: orderNotes.trim() || null
      });
      setConfirmedOrder(order);
      notify("Order placed", [10, 60, 10]);
      setOrderConfirmed(true);
    } catch {
      notify("Could not place order", [20, 80, 20]);
    } finally {
      setPlacingOrder(false);
    }
  };

  const closeConfirmedOrder = () => {
    setCheckoutOpen(false);
    setOrderConfirmed(false);
    setConfirmedOrder(null);
    setGuestName("");
    setPickupWindow(pickupOptions[0]);
    setOrderNotes("");
    clearCart();
    setMode("menu");
  };

  const sendMessage = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setMode("assistant");
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", content }
    ]);
    setLoading(true);

    try {
      const activeClarification = pendingClarification;
      const response = await submitAssistantMessage(content, cart, activeClarification);
      applyActions(response.actions as CartAction[], response.assistantMessage);
      notify(
        response.clarificationQuestion
          ? "Assistant needs one detail"
          : response.actions.length > 0
            ? "Assistant updated the cart"
            : "Assistant replied"
      );
      setPendingClarification(
        response.clarificationQuestion
          ? {
              originalMessage: activeClarification?.originalMessage ?? content,
              question: response.clarificationQuestion
            }
          : null
      );
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: response.clarificationQuestion ?? response.assistantMessage
        }
      ]);
    } catch {
      notify("Assistant unavailable", [20, 80, 20]);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content: "I could not reach the kitchen brain just now. Start the API server and I’ll pick this back up."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Intelligent Bistro</Text>
              <Text style={styles.title}>Dinner, handled.</Text>
            </View>
            <Pressable
              style={styles.cartPill}
              onPress={() => setMode("cart")}
              accessibilityRole="button"
              accessibilityLabel="Open cart summary"
            >
              <Text style={styles.cartPillCount}>{cartCount}</Text>
              <Text style={styles.cartPillText}>{money(cart.totals.total)}</Text>
            </Pressable>
          </View>

          <SegmentedControl value={mode} onChange={setMode} />

          {toast ? (
            <View style={styles.toast} pointerEvents="none">
              <Check size={15} color="#FFFFFF" />
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}

          {mode === "menu" && (
            <View style={styles.content}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {categories.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setCategory(item.id)}
                    style={[styles.categoryChip, category === item.id && styles.categoryChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === item.id }}
                    accessibilityLabel={`Filter ${item.label}`}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item.id && styles.categoryTextActive
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuList}>
                {visibleMenu.map((item) => (
                  <MenuCard key={item.id} item={item} onCustomize={() => openCustomizer(item)} />
                ))}
              </ScrollView>
            </View>
          )}

          {mode === "assistant" && (
            <View style={styles.assistantPane}>
              <ScrollView contentContainerStyle={styles.chatList} showsVerticalScrollIndicator={false}>
                <View style={styles.suggestionBlock}>
                  <View style={styles.suggestionTitleRow}>
                    <Sparkles size={16} color="#B44B2A" />
                    <Text style={styles.suggestionTitle}>Fast prompts</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        onPress={() => sendMessage(suggestion)}
                        disabled={loading}
                        style={[styles.suggestionChip, loading && styles.suggestionChipDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Send prompt: ${suggestion}`}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.bubble,
                      message.role === "user" ? styles.userBubble : styles.assistantBubble
                    ]}
                  >
                    {message.role === "assistant" && <Bot size={15} color="#32615B" />}
                    <Text
                      style={[
                        styles.bubbleText,
                        message.role === "user" && styles.userBubbleText
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                ))}
                {loading && <ActivityIndicator color="#22312B" />}
              </ScrollView>

              {pendingClarification ? (
                <View style={styles.clarificationBanner}>
                  <Text style={styles.clarificationLabel}>Clarifying</Text>
                  <Text style={styles.clarificationText}>
                    {pendingClarification.originalMessage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.composer}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder={
                    pendingClarification
                      ? "Answer with first, second, or the item details..."
                      : "Ask the bistro AI to update your order..."
                  }
                  placeholderTextColor="#94897D"
                  style={styles.input}
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage()}
                />
                <Pressable
                  style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                  onPress={() => sendMessage()}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                >
                  <Text style={styles.hiddenText}>Send message</Text>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {mode === "cart" && (
            <ScrollView contentContainerStyle={styles.cartPane} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Current order</Text>
              {cart.items.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyTitle}>Your cart is waiting.</Text>
                  <Text style={styles.emptyText}>
                    Add from the menu or ask the assistant for a full order in one sentence.
                  </Text>
                </View>
              ) : (
                cart.items.map((item) => (
                  <View key={item.id} style={styles.cartLine}>
                    <View style={styles.cartLineMain}>
                      <Text style={styles.cartLineName}>{item.name}</Text>
                      <Text style={styles.cartLineMeta}>
                        {item.quantity} x {money(item.unitPrice)}
                      </Text>
                      {describeCartItem(item) ? (
                        <Text style={styles.cartLineDetails}>{describeCartItem(item)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.quantityTools}>
                      <IconButton
                        icon="edit"
                        onPress={() => openCartEditor(item)}
                      />
                      <IconButton
                        onPress={() =>
                          applyAction({
                            type: "UPDATE_QUANTITY",
                            cartItemId: item.id,
                            menuItemId: null,
                            quantity: item.quantity - 1
                          })
                        }
                        icon="minus"
                      />
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <IconButton
                        onPress={() =>
                          applyAction({
                            type: "UPDATE_QUANTITY",
                            cartItemId: item.id,
                            menuItemId: null,
                            quantity: item.quantity + 1
                          })
                        }
                        icon="plus"
                      />
                      <IconButton
                        onPress={() =>
                          applyAction({
                            type: "REMOVE_ITEM",
                            cartItemId: item.id,
                            menuItemId: null,
                            quantity: null
                          })
                        }
                        icon="trash"
                      />
                    </View>
                  </View>
                ))
              )}

              <View style={styles.totals}>
                <TotalLine label="Subtotal" value={cart.totals.subtotal} />
                <TotalLine label="Tax" value={cart.totals.tax} />
                <TotalLine label="Service" value={cart.totals.service} />
                <View style={styles.totalRule} />
                <TotalLine label="Total" value={cart.totals.total} strong />
              </View>

              {cart.items.length > 0 ? (
                <Pressable
                  style={styles.checkoutButton}
                  onPress={openCheckout}
                  accessibilityRole="button"
                  accessibilityLabel="Review checkout"
                  testID="review-checkout"
                >
                  <ClipboardCheck size={18} color="#FFFFFF" />
                  <Text style={styles.checkoutButtonText}>Review checkout</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </View>

        <Modal
          visible={selectedItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedItem(null)}
        >
          {selectedItem ? (
            <View style={styles.modalScrim}>
              <View style={styles.customizer}>
                <View style={styles.customizerHeader}>
                  <View style={styles.customizerTitleWrap}>
                    <Text style={styles.customizerEyebrow}>
                      {customizerMode.type === "edit" ? "Edit item" : "Customize"}
                    </Text>
                    <Text style={styles.customizerTitle}>{selectedItem.name}</Text>
                  </View>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setSelectedItem(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close customizer"
                  >
                    <X size={18} color="#22312B" />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.customizerBody}>
                  <Image source={{ uri: selectedItem.imageUrl }} style={styles.customizerImage} />
                  <Text style={styles.customizerDescription}>{selectedItem.description}</Text>

                  <View style={styles.optionSection}>
                    <Text style={styles.optionTitle}>Quantity</Text>
                    <View style={styles.stepper}>
                      <IconButton
                        icon="minus"
                        onPress={() => setDraftQuantity((quantity) => Math.max(1, quantity - 1))}
                      />
                      <Text style={styles.stepperValue}>{draftQuantity}</Text>
                      <IconButton
                        icon="plus"
                        onPress={() => setDraftQuantity((quantity) => Math.min(20, quantity + 1))}
                      />
                    </View>
                  </View>

                  <View style={styles.optionSection}>
                    <Text style={styles.optionTitle}>Style</Text>
                    <View style={styles.optionGrid}>
                      {selectedItem.variants.map((variant) => {
                        const selected = draftVariantId === variant.id;
                        return (
                          <Pressable
                            key={variant.id}
                            style={[styles.choice, selected && styles.choiceSelected]}
                            onPress={() => setDraftVariantId(variant.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`Choose ${variant.label}`}
                          >
                            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                              {variant.label}
                            </Text>
                            {variant.priceDelta > 0 ? (
                              <Text style={[styles.choicePrice, selected && styles.choiceLabelSelected]}>
                                +{money(variant.priceDelta)}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.optionSection}>
                    <Text style={styles.optionTitle}>Modifiers</Text>
                    <View style={styles.optionGrid}>
                      {selectedItem.modifiers.map((modifier) => {
                        const selected = draftModifierIds.includes(modifier.id);
                        return (
                          <Pressable
                            key={modifier.id}
                            style={[styles.choice, selected && styles.choiceSelected]}
                            onPress={() => toggleModifier(modifier.id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            accessibilityLabel={modifier.label}
                          >
                            <View style={styles.choiceLine}>
                              <Text
                                style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}
                              >
                                {modifier.label}
                              </Text>
                              {selected ? <Check size={15} color="#FFFFFF" /> : null}
                            </View>
                            {modifier.priceDelta > 0 ? (
                              <Text style={[styles.choicePrice, selected && styles.choiceLabelSelected]}>
                                +{money(modifier.priceDelta)}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.optionSection}>
                    <Text style={styles.optionTitle}>Kitchen note</Text>
                    <TextInput
                      value={draftInstructions}
                      onChangeText={setDraftInstructions}
                      placeholder="Sauce on the side, cut in half..."
                      placeholderTextColor="#94897D"
                      multiline
                      style={styles.noteInput}
                    />
                  </View>
                </ScrollView>

                <View style={styles.customizerFooter}>
                  <View>
                    <Text style={styles.footerLabel}>
                      {customizerMode.type === "edit" ? "Updated total" : "Item total"}
                    </Text>
                    <Text style={styles.footerPrice}>{money(draftUnitPrice * draftQuantity)}</Text>
                  </View>
                  <Pressable
                    style={styles.addToOrderButton}
                    onPress={saveCustomizedItem}
                    accessibilityRole="button"
                    accessibilityLabel={
                      customizerMode.type === "edit"
                        ? `Save ${selectedItem.name} changes`
                        : `Add ${selectedItem.name} to order`
                    }
                    testID={customizerMode.type === "edit" ? "save-cart-item" : "add-customized-item"}
                  >
                    {customizerMode.type === "edit" ? (
                      <Check size={18} color="#FFFFFF" />
                    ) : (
                      <Plus size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.addToOrderText}>
                      {customizerMode.type === "edit" ? "Save changes" : "Add to order"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </Modal>

        <Modal
          visible={checkoutOpen}
          transparent
          animationType="slide"
          onRequestClose={() => (orderConfirmed ? closeConfirmedOrder() : setCheckoutOpen(false))}
        >
          <View style={styles.modalScrim}>
            <View style={styles.checkoutSheet}>
              {orderConfirmed ? (
                <View style={styles.confirmationPane}>
                  <View style={styles.confirmationIcon}>
                    <Check size={34} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <Text style={styles.confirmationTitle}>Order placed</Text>
                  <Text style={styles.confirmationText}>
                    {guestName.trim() ? `${guestName.trim()}, your` : "Your"} bistro order is queued for{" "}
                    {confirmedOrder?.estimatedReadyAt ?? pickupWindow}. The kitchen has your cart details and notes.
                  </Text>
                  {confirmedOrder ? (
                    <View style={styles.orderNumberPill}>
                      <Text style={styles.orderNumberLabel}>Order</Text>
                      <Text style={styles.orderNumberText}>{confirmedOrder.id}</Text>
                    </View>
                  ) : null}
                  <View style={styles.confirmationSummary}>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>Items</Text>
                      <Text style={styles.totalValue}>{cartCount}</Text>
                    </View>
                    <TotalLine label="Paid total" value={cart.totals.total} strong />
                  </View>
                  <Pressable
                    style={styles.doneButton}
                    onPress={closeConfirmedOrder}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                    testID="done-order"
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.checkoutHeader}>
                    <View style={styles.customizerTitleWrap}>
                      <Text style={styles.customizerEyebrow}>Checkout</Text>
                      <Text style={styles.customizerTitle}>Review your order</Text>
                    </View>
                    <Pressable
                      style={styles.closeButton}
                      onPress={() => setCheckoutOpen(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Close checkout"
                    >
                      <X size={18} color="#22312B" />
                    </Pressable>
                  </View>

                  <ScrollView contentContainerStyle={styles.checkoutBody}>
                    <View style={styles.checkoutSection}>
                      <View style={styles.checkoutSectionTitleRow}>
                        <Clock size={16} color="#B44B2A" />
                        <Text style={styles.optionTitle}>Pickup time</Text>
                      </View>
                      <View style={styles.pickupGrid}>
                        {pickupOptions.map((option) => {
                          const selected = pickupWindow === option;
                          return (
                            <Pressable
                              key={option}
                              style={[styles.pickupChoice, selected && styles.pickupChoiceSelected]}
                              onPress={() => setPickupWindow(option)}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`Pickup ${option}`}
                            >
                              <Text
                                style={[
                                  styles.pickupChoiceText,
                                  selected && styles.pickupChoiceTextSelected
                                ]}
                              >
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.checkoutSection}>
                      <View style={styles.checkoutSectionTitleRow}>
                        <User size={16} color="#B44B2A" />
                        <Text style={styles.optionTitle}>Guest details</Text>
                      </View>
                      <TextInput
                        value={guestName}
                        onChangeText={setGuestName}
                        placeholder="Name for pickup"
                        placeholderTextColor="#94897D"
                        style={styles.checkoutInput}
                      />
                    </View>

                    <View style={styles.checkoutSection}>
                      <Text style={styles.optionTitle}>Order notes</Text>
                      <TextInput
                        value={orderNotes}
                        onChangeText={setOrderNotes}
                        placeholder="Utensils, allergy note, curbside details..."
                        placeholderTextColor="#94897D"
                        multiline
                        style={styles.noteInput}
                      />
                    </View>

                    <View style={styles.checkoutSection}>
                      <Text style={styles.optionTitle}>Order summary</Text>
                      {cart.items.map((item) => (
                        <View key={item.id} style={styles.checkoutLine}>
                          <View style={styles.checkoutLineCopy}>
                            <Text style={styles.cartLineName}>{item.name}</Text>
                            <Text style={styles.cartLineMeta}>
                              {item.quantity} x {money(item.unitPrice)}
                            </Text>
                            {describeCartItem(item) ? (
                              <Text style={styles.cartLineDetails}>{describeCartItem(item)}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.checkoutLinePrice}>
                            {money(item.unitPrice * item.quantity)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.totals}>
                      <TotalLine label="Subtotal" value={cart.totals.subtotal} />
                      <TotalLine label="Tax" value={cart.totals.tax} />
                      <TotalLine label="Service" value={cart.totals.service} />
                      <View style={styles.totalRule} />
                      <TotalLine label="Total" value={cart.totals.total} strong />
                    </View>
                  </ScrollView>

                  <View style={styles.checkoutFooter}>
                    <View>
                      <Text style={styles.footerLabel}>Due now</Text>
                      <Text style={styles.footerPrice}>{money(cart.totals.total)}</Text>
                    </View>
                    <Pressable
                      style={[styles.placeOrderButton, placingOrder && styles.placeOrderButtonDisabled]}
                      onPress={placeOrder}
                      disabled={placingOrder}
                      accessibilityRole="button"
                      accessibilityLabel="Place order"
                      testID="place-order"
                    >
                      {placingOrder ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Check size={18} color="#FFFFFF" />
                      )}
                      <Text style={styles.addToOrderText}>
                        {placingOrder ? "Placing..." : "Place order"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MenuCard({ item, onCustomize }: { item: MenuItem; onCustomize: () => void }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardCopy}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>
          <Text style={styles.price}>{money(item.basePrice)}</Text>
        </View>
        <View style={styles.tagRow}>
          {item.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={[styles.tag, { borderColor: item.accentColor }]}>
              <Text style={[styles.tagText, { color: item.accentColor }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.addButton, { backgroundColor: item.accentColor }]}
          onPress={onCustomize}
          accessibilityRole="button"
          accessibilityLabel={`Customize ${item.name}`}
          testID={`customize-${item.id}`}
        >
          <Plus size={17} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.addButtonText}>Customize</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconButton({
  icon,
  onPress
}: {
  icon: "edit" | "minus" | "plus" | "trash";
  onPress: () => void;
}) {
  const Icon = icon === "minus" ? Minus : icon === "plus" ? Plus : icon === "edit" ? Pencil : Trash2;
  const label =
    icon === "trash"
      ? "Remove item"
      : icon === "plus"
        ? "Increase quantity"
        : icon === "edit"
          ? "Edit item"
          : "Decrease quantity";
  return (
    <Pressable
      style={styles.iconButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`cart-${icon}-button`}
    >
      <Icon size={15} color={icon === "trash" ? "#A73528" : "#22312B"} />
    </Pressable>
  );
}

function TotalLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValue, strong && styles.totalStrong]}>{money(value)}</Text>
    </View>
  );
}

function describeCartItem(item: CartItem) {
  const menuItem = MENU_ITEMS.find((menu) => menu.id === item.menuItemId);
  if (!menuItem) return "";

  const variant = menuItem.variants.find((candidate) => candidate.id === item.variantId);
  const modifiers = item.modifierIds
    .map((modifierId) => menuItem.modifiers.find((modifier) => modifier.id === modifierId)?.label)
    .filter(Boolean);
  const details = [
    variant?.label,
    ...modifiers,
    item.specialInstructions ? `Note: ${item.specialInstructions}` : null
  ].filter(Boolean);

  return details.join(" · ");
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F2"
  },
  keyboard: {
    flex: 1
  },
  shell: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 14
  },
  toast: {
    position: "absolute",
    top: 126,
    left: 16,
    right: 16,
    zIndex: 20,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#22312B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  header: {
    minHeight: 108,
    borderRadius: 8,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7D8C5"
  },
  eyebrow: {
    color: "#8A4934",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: {
    marginTop: 4,
    color: "#22312B",
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900"
  },
  cartPill: {
    minWidth: 86,
    borderRadius: 8,
    backgroundColor: "#22312B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  cartPillCount: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  cartPillText: {
    color: "#DDE9DB",
    fontSize: 12,
    fontWeight: "800"
  },
  content: {
    flex: 1
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5"
  },
  categoryChipActive: {
    backgroundColor: "#B44B2A",
    borderColor: "#B44B2A"
  },
  categoryText: {
    color: "#665C52",
    fontWeight: "800",
    fontSize: 13
  },
  categoryTextActive: {
    color: "#FFFFFF"
  },
  menuList: {
    gap: 14,
    paddingBottom: 28
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7D8C5"
  },
  cardImage: {
    width: "100%",
    height: 168,
    backgroundColor: "#EDE3D6"
  },
  cardBody: {
    padding: 14,
    gap: 12
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  cardCopy: {
    flex: 1,
    gap: 5
  },
  itemName: {
    color: "#22312B",
    fontSize: 19,
    fontWeight: "900"
  },
  itemDescription: {
    color: "#665C52",
    fontSize: 13,
    lineHeight: 18
  },
  price: {
    color: "#22312B",
    fontSize: 16,
    fontWeight: "900"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tagText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  addButton: {
    height: 42,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15
  },
  assistantPane: {
    flex: 1,
    gap: 12
  },
  chatList: {
    gap: 10,
    paddingBottom: 10
  },
  suggestionBlock: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5",
    borderRadius: 8,
    padding: 12,
    gap: 10
  },
  suggestionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  suggestionTitle: {
    color: "#22312B",
    fontWeight: "900",
    fontSize: 14
  },
  suggestionChip: {
    maxWidth: 260,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F2E4D9"
  },
  suggestionChipDisabled: {
    opacity: 0.55
  },
  suggestionText: {
    color: "#5F3E30",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 16
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    gap: 8
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#22312B"
  },
  bubbleText: {
    flexShrink: 1,
    color: "#2C2A28",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600"
  },
  userBubbleText: {
    color: "#FFFFFF"
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12
  },
  clarificationBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3
  },
  clarificationLabel: {
    color: "#8A4934",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  clarificationText: {
    color: "#22312B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 104,
    borderRadius: 8,
    paddingHorizontal: 13,
    color: "#22312B",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5",
    fontWeight: "700"
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#B44B2A",
    alignItems: "center",
    justifyContent: "center"
  },
  sendButtonDisabled: {
    backgroundColor: "#8B756B"
  },
  hiddenText: {
    width: 1,
    height: 1,
    opacity: 0,
    position: "absolute"
  },
  cartPane: {
    gap: 14,
    paddingBottom: 28
  },
  sectionTitle: {
    color: "#22312B",
    fontSize: 23,
    fontWeight: "900"
  },
  emptyCart: {
    minHeight: 180,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    gap: 8
  },
  emptyTitle: {
    color: "#22312B",
    fontSize: 19,
    fontWeight: "900"
  },
  emptyText: {
    color: "#665C52",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600"
  },
  cartLine: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7D8C5",
    borderRadius: 8,
    padding: 13,
    gap: 12
  },
  cartLineMain: {
    gap: 4
  },
  cartLineName: {
    color: "#22312B",
    fontSize: 16,
    fontWeight: "900"
  },
  cartLineMeta: {
    color: "#756B60",
    fontSize: 13,
    fontWeight: "700"
  },
  cartLineDetails: {
    color: "#8A4934",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  quantityTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F3ECE4",
    alignItems: "center",
    justifyContent: "center"
  },
  quantityText: {
    minWidth: 24,
    textAlign: "center",
    color: "#22312B",
    fontSize: 15,
    fontWeight: "900"
  },
  totals: {
    backgroundColor: "#22312B",
    borderRadius: 8,
    padding: 16,
    gap: 9
  },
  checkoutButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#B44B2A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    color: "#DDE9DB",
    fontWeight: "700"
  },
  totalValue: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  totalRule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 2
  },
  totalStrong: {
    fontSize: 18,
    fontWeight: "900"
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(34, 49, 43, 0.42)"
  },
  customizer: {
    maxHeight: "92%",
    backgroundColor: "#FAF7F2",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    overflow: "hidden"
  },
  checkoutSheet: {
    maxHeight: "92%",
    backgroundColor: "#FAF7F2",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    overflow: "hidden"
  },
  customizerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7D8C5"
  },
  checkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7D8C5"
  },
  customizerTitleWrap: {
    flex: 1,
    paddingRight: 12
  },
  customizerEyebrow: {
    color: "#8A4934",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  customizerTitle: {
    marginTop: 3,
    color: "#22312B",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900"
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3ECE4"
  },
  customizerBody: {
    padding: 16,
    gap: 16
  },
  customizerImage: {
    width: "100%",
    height: 172,
    borderRadius: 8,
    backgroundColor: "#EDE3D6"
  },
  customizerDescription: {
    color: "#665C52",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  optionSection: {
    gap: 10
  },
  optionTitle: {
    color: "#22312B",
    fontSize: 15,
    fontWeight: "900"
  },
  stepper: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    padding: 8
  },
  stepperValue: {
    minWidth: 32,
    textAlign: "center",
    color: "#22312B",
    fontSize: 18,
    fontWeight: "900"
  },
  optionGrid: {
    gap: 8
  },
  choice: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 3
  },
  choiceSelected: {
    backgroundColor: "#22312B",
    borderColor: "#22312B"
  },
  choiceLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  choiceLabel: {
    flex: 1,
    color: "#2C2A28",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  choicePrice: {
    color: "#8A4934",
    fontSize: 12,
    fontWeight: "900"
  },
  choiceLabelSelected: {
    color: "#FFFFFF"
  },
  noteInput: {
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    color: "#22312B",
    padding: 12,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    textAlignVertical: "top"
  },
  checkoutBody: {
    padding: 16,
    gap: 14
  },
  checkoutSection: {
    gap: 10
  },
  checkoutSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  pickupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pickupChoice: {
    minHeight: 42,
    minWidth: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  pickupChoiceSelected: {
    backgroundColor: "#22312B",
    borderColor: "#22312B"
  },
  pickupChoiceText: {
    color: "#665C52",
    fontSize: 13,
    fontWeight: "900"
  },
  pickupChoiceTextSelected: {
    color: "#FFFFFF"
  },
  checkoutInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    color: "#22312B",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800"
  },
  checkoutLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    padding: 12
  },
  checkoutLineCopy: {
    flex: 1,
    gap: 3
  },
  checkoutLinePrice: {
    color: "#22312B",
    fontSize: 14,
    fontWeight: "900"
  },
  customizerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E7D8C5"
  },
  checkoutFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E7D8C5"
  },
  footerLabel: {
    color: "#665C52",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  footerPrice: {
    color: "#22312B",
    fontSize: 22,
    fontWeight: "900"
  },
  addToOrderButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#B44B2A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  placeOrderButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#B44B2A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  placeOrderButtonDisabled: {
    backgroundColor: "#8B756B"
  },
  addToOrderText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  confirmationPane: {
    padding: 24,
    alignItems: "center",
    gap: 14
  },
  confirmationIcon: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#22312B",
    alignItems: "center",
    justifyContent: "center"
  },
  confirmationTitle: {
    color: "#22312B",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center"
  },
  confirmationText: {
    color: "#665C52",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  orderNumberPill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2
  },
  orderNumberLabel: {
    color: "#8A4934",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  orderNumberText: {
    color: "#22312B",
    fontSize: 17,
    fontWeight: "900"
  },
  confirmationSummary: {
    alignSelf: "stretch",
    backgroundColor: "#22312B",
    borderRadius: 8,
    padding: 16,
    gap: 9
  },
  doneButton: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#B44B2A",
    alignItems: "center",
    justifyContent: "center"
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
