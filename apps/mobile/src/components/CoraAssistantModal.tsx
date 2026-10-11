import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Mic, Send, X, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { C, Spacing, Radius } from './theme';
import { useAuth } from '../lib/auth';
import { createAiApi, CoraChatResponse } from '../services/aiApi';
import type { PatientEncounter } from '../types/domain';
import { formatPeso, remainingBalance } from '../lib/format';

export interface CoraAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  encounter?: PatientEncounter | null;
  navigation?: any;
  initialQuery?: string;
}

interface ChatMessage {
  id: string;
  sender: 'cora' | 'patient';
  text: string;
  timestamp: string;
  isError?: boolean;
  suggestedActions?: Array<{
    label: string;
    actionType: string;
    payload?: Record<string, any>;
  }>;
}

const SUGGESTED_CHIPS: Record<'fil' | 'en' | 'ilo', string[]> = {
  fil: [
    'Bakit may bayad ang gamot?',
    'Paano magbayad gamit ang GCash?',
    'Ano ang PhilHealth benefit ko?',
    'May Senior Citizen discount ba ako?',
    'Paano mag-apply ng Promissory Note?'
  ],
  en: [
    'Why is there an out-of-pocket balance?',
    'How do I pay with GCash or Maya?',
    'Explain my PhilHealth deduction',
    'How is Senior / PWD discount calculated?',
    'How does a Promissory Note work?'
  ],
  ilo: [
    'Apay nga adda bayadan iti agas?',
    'Kasanu ti agbayad iti GCash wenno Maya?',
    'Ania ti PhilHealth benefit ko?',
    'Adda kadi discount ti Senior Citizen?',
    'Kasanu ti ag-apply ti Promissory Note?'
  ]
};

export const CoraAssistantModal: React.FC<CoraAssistantModalProps> = ({
  visible,
  onClose,
  encounter,
  navigation,
  initialQuery
}) => {
  const insets = useSafeAreaInsets();
  const { client } = useAuth();
  const [language, setLanguage] = useState<'fil' | 'en' | 'ilo'>('fil');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    pendingRequest.current?.abort();
    setMessages([]); setLoading(false); setInput(visible ? initialQuery || '' : '');
    return () => { pendingRequest.current?.abort(); };
  }, [visible, language, initialQuery, encounter?.uuid, client]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading || !encounter?.uuid) return;
    const controller = new AbortController();
    pendingRequest.current?.abort(); pendingRequest.current = controller;

    const patientMsg: ChatMessage = {
      id: `patient-${Date.now()}`,
      sender: 'patient',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, patientMsg]);
    setInput('');
    setLoading(true);

    try {
      const api = createAiApi(client);
      const res: CoraChatResponse = await api.sendCoraMessage(
        textToSend,
        language,
        encounter.uuid,
        undefined,
        controller.signal
      );

      if (controller.signal.aborted) return;
      const coraMsg: ChatMessage = {
        id: `cora-${Date.now()}`,
        sender: 'cora',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions
      };

      setMessages((prev) => [...prev, coraMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const errorMsg: ChatMessage = {
        id: `cora-error-${Date.now()}`,
        sender: 'cora',
        isError: true,
        text: err?.message || 'AI generation failed. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'fil' ? 'fil-PH' : language === 'ilo' ? 'ilo-PH' : 'en-PH';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechNotice('Listening… Speak now.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          setSpeechNotice(null);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechNotice('Could not recognize voice. Please type your message.');
        setTimeout(() => setSpeechNotice(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechNotice(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      setSpeechNotice('Voice input available in web browser. Please type below.');
      setTimeout(() => setSpeechNotice(null), 3000);
    }
  };

  const handleActionClick = (action: { actionType: string; payload?: Record<string, any> }) => {
    onClose();
    if (!navigation) return;

    if (action.actionType === 'NAVIGATE_BILL') {
      navigation.navigate('Bill');
    } else if (action.actionType === 'NAVIGATE_PAYMENT') {
      if (encounter) {
        navigation.navigate('PaymentFlow', { encounterId: encounter.uuid });
      } else {
        navigation.navigate('Payments');
      }
    } else if (action.actionType === 'NAVIGATE_COVERAGE') {
      navigation.navigate('Coverage');
    } else if (action.actionType === 'NAVIGATE_DOCUMENTS') {
      navigation.navigate('Documents');
    }
  };

  if (!visible) return null;

  const w = encounter?.waterfall;
  const balance = encounter ? remainingBalance(encounter) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.modalSheet, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.coraAvatar}>
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>Cora AI</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Concierge</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>Multilingual Patient Billing Assistant</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close Cora assistant"
                style={styles.closeButton}
              >
                <X size={20} color={C.secondary} />
              </Pressable>
            </View>

            {/* Language Selector */}
            <View style={styles.langBar}>
              {(['fil', 'en', 'ilo'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.langChip, language === lang && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, language === lang && styles.langChipTextActive]}>
                    {lang === 'fil' ? 'Taglish' : lang === 'en' ? 'English' : 'Ilokano'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Invariant Truth Notice */}
            <View style={styles.invariantPill}>
              <ShieldCheck size={13} color={C.brand} />
              <Text style={styles.invariantPillText}>
                Zero Centavo Drift · Figures Grounded in Official eSOA
              </Text>
            </View>
          </View>

          {/* Grounded Financial Truth Banner (if stay available) */}
          {w && (
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Your Hospital Statement</Text>
                <Text style={styles.balanceNumber}>{formatPeso(balance)} Due</Text>
              </View>
              <View style={styles.balanceGrid}>
                <Text style={styles.balanceItem}>Gross: {formatPeso(w.grossTotal)}</Text>
                <Text style={styles.balanceItem}>PhilHealth: −{formatPeso(w.philhealthTotal)}</Text>
                <Text style={styles.balanceItem}>HMO: −{formatPeso(w.hmoApprovedAmount)}</Text>
                <Text style={styles.balanceItem}>
                  Discounts: −{formatPeso(w.vatExemption + w.seniorPwdDiscount)}
                </Text>
              </View>
            </View>
          )}

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContainer}
            showsVerticalScrollIndicator={false}
          >
            {!encounter?.uuid && <Text accessibilityRole="alert" style={{ color: C.danger }}>Choose a hospital stay before asking Cora about billing.</Text>}
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgRow,
                  m.sender === 'patient' ? styles.msgRowPatient : styles.msgRowCora
                ]}
              >
                {m.sender === 'cora' && (
                  <View style={styles.coraMiniAvatar}>
                    <Sparkles size={12} color="#FFFFFF" />
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    m.sender === 'patient' ? styles.msgBubblePatient : styles.msgBubbleCora
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      m.sender === 'patient' ? styles.msgTextPatient : styles.msgTextCora
                    ]}
                  >
                    {m.isError ? `AI response unavailable: ${m.text}` : m.text}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      m.sender === 'patient' ? styles.msgTimePatient : styles.msgTimeCora
                    ]}
                  >
                    {m.timestamp}
                  </Text>

                  {/* Render Suggested Action Buttons if present */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <View style={styles.actionsContainer}>
                      {m.suggestedActions.map((act, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => handleActionClick(act)}
                          style={styles.actionButton}
                        >
                          <Text style={styles.actionButtonText}>{act.label}</Text>
                          <ChevronRight size={14} color={C.brand} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {loading && (
              <View style={[styles.msgRow, styles.msgRowCora]}>
                <View style={styles.coraMiniAvatar}>
                  <Sparkles size={12} color="#FFFFFF" />
                </View>
                <View style={[styles.msgBubble, styles.msgBubbleCora, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={C.brand} />
                  <Text style={[styles.msgTextCora, { fontSize: 12, marginLeft: 8 }]}>
                    Cora is verifying statutory rules…
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Question Chips */}
          <View style={styles.chipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {SUGGESTED_CHIPS[language].map((chip, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSend(chip)}
                  disabled={loading}
                  style={styles.chipButton}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Speech Feedback Notice */}
          {speechNotice && (
            <View style={styles.speechBanner}>
              <Text style={styles.speechBannerText}>{speechNotice}</Text>
            </View>
          )}

          {/* Input Footer */}
          <View style={styles.inputBar}>
            <Pressable
              onPress={handleVoiceToggle}
              style={[styles.iconButton, isListening && styles.iconButtonActive]}
              accessibilityLabel="Voice speech recognition"
            >
              <Mic size={20} color={isListening ? C.danger : C.secondary} />
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                language === 'fil'
                  ? 'Magtanong kay Cora tungkol sa billing…'
                  : language === 'ilo'
                  ? 'Agdamag ken Cora maipapan ti billing mo…'
                  : 'Ask Cora about your hospital bill…'
              }
              placeholderTextColor={C.faint}
              style={styles.inputField}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              editable={!loading}
            />

            <Pressable
              onPress={() => handleSend()}
              disabled={loading || !input.trim() || !encounter?.uuid}
              style={[
                styles.sendButton,
                (!input.trim() || loading || !encounter?.uuid) && styles.sendButtonDisabled
              ]}
              accessibilityLabel="Send question to Cora"
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    height: '92%',
    maxHeight: 740,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  coraAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink
  },
  badge: {
    backgroundColor: C.brandSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.badge
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.brandDark,
    textTransform: 'uppercase'
  },
  headerSub: {
    fontSize: 11,
    color: C.secondary,
    marginTop: 1
  },
  closeButton: {
    padding: 6,
    borderRadius: 8
  },
  langBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border
  },
  langChipActive: {
    backgroundColor: C.brandSoft,
    borderColor: C.brand
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary
  },
  langChipTextActive: {
    color: C.brandDark,
    fontWeight: '700'
  },
  invariantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8
  },
  invariantPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D'
  },
  balanceCard: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 10
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
    textTransform: 'uppercase'
  },
  balanceNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  balanceItem: {
    fontSize: 10,
    color: C.faint,
    backgroundColor: C.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border
  },
  chatScroll: {
    flex: 1
  },
  chatContainer: {
    padding: Spacing.gutter,
    gap: 12
  },
  msgRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end'
  },
  msgRowCora: {
    justifyContent: 'flex-start'
  },
  msgRowPatient: {
    justifyContent: 'flex-end'
  },
  coraMiniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16
  },
  msgBubbleCora: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4
  },
  msgBubblePatient: {
    backgroundColor: C.brand,
    borderBottomRightRadius: 4
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18
  },
  msgTextCora: {
    color: C.ink
  },
  msgTextPatient: {
    color: '#FFFFFF'
  },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right'
  },
  msgTimeCora: {
    color: C.faint
  },
  msgTimePatient: {
    color: 'rgba(255,255,255,0.7)'
  },
  actionsContainer: {
    marginTop: 8,
    gap: 6
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.brandDark
  },
  chipsSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    paddingVertical: 6
  },
  chipsScroll: {
    paddingHorizontal: Spacing.gutter,
    gap: 6
  },
  chipButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  chipText: {
    fontSize: 11,
    color: C.secondary,
    fontWeight: '500'
  },
  speechBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 4
  },
  speechBannerText: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center'
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 8,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: C.elevated
  },
  iconButtonActive: {
    backgroundColor: '#FEE2E2'
  },
  inputField: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    color: C.ink
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: C.border
  }
});
