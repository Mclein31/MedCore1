import { useCoraLanguage } from '../hooks/useCoraLanguage';
import CoraTypingDots from './CoraTypingDots';
import { CORA_LANGUAGE_LABELS, CORA_LANGUAGE_OPTIONS, type CoraLanguage } from '../../../shared/coraLanguage';
import { ModalOverlay } from './ModalOverlay';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Send, X, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { CoraAvatar } from './CoraAvatar';
import { C, Spacing, Radius } from './theme';
import { useAuth } from '../lib/auth';
import { createAiApi, CoraChatResponse } from '../services/aiApi';
import { CORA_QUESTIONS, CORA_WELCOME, CoraOpeningPolicy, coraHistory, type CoraMode } from '../lib/coraConversation';
import type { PatientEncounter } from '../types/domain';
import { formatPeso, remainingBalance } from '../lib/format';

export interface CoraAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  encounter?: PatientEncounter | null;
  navigation?: any;
  initialQuery?: string;
  autoSendInitialQuery?: boolean;
  initialMode?: CoraMode;
}

interface ChatMessage {
  id: string;
  sender: 'cora' | 'patient';
  language: CoraLanguage;
  text: string;
  timestamp: string;
  isError?: boolean;
  isWelcome?: boolean;
  isNotice?: boolean;
  suggestedActions?: Array<{
    label: string;
    actionType: string;
    payload?: Record<string, any>;
  }>;
}

export const CoraAssistantModal: React.FC<CoraAssistantModalProps> = ({
  visible,
  onClose,
  encounter,
  navigation,
  initialQuery,
  autoSendInitialQuery = false,
  initialMode = 'GENERAL'
}) => {
  const insets = useSafeAreaInsets();
  const { client } = useAuth();
  const [language, setLanguage] = useCoraLanguage();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const activeContext = useRef({ client, encounterId: encounter?.uuid, language, visible });
  activeContext.current = { client, encounterId: encounter?.uuid, language, visible };

  const stopSpeech = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { if (recognition.abort) recognition.abort(); else recognition.stop(); } catch {}
    }
  };
  const cancelPending = () => {
    const controller = pendingRequest.current;
    pendingRequest.current = null;
    controller?.abort();
    setLoading(false);
  };
  const changeLanguage = (next: CoraLanguage) => {
    if (next === language) return;
    cancelPending(); stopSpeech();
    activeContext.current.language = next;
    setIsListening(false); setSpeechNotice(null);
    messagesRef.current = messagesRef.current.map(message => message.isWelcome ? { ...message, language: next, text: CORA_WELCOME[next] } : message);
    setMessages(messagesRef.current); setLanguage(next);
  };
  const closeAssistant = () => {
    cancelPending(); stopSpeech(); setIsListening(false); setSpeechNotice(null); onClose();
  };

  const openingPolicy = useRef(new CoraOpeningPolicy());
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendRef = useRef<(text: string, mode?: CoraMode) => Promise<void>>(async () => {});
  const appendMessage = (message: ChatMessage) => {
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
  };

  useEffect(() => {
    cancelPending(); stopSpeech(); openingPolicy.current.reset();
    messagesRef.current = []; setMessages([]); setLoading(false);
    return () => { pendingRequest.current?.abort(); pendingRequest.current = null; stopSpeech(); };
  }, [client, encounter?.uuid]);

  useEffect(() => {
    cancelPending(); stopSpeech(); setIsListening(false); setSpeechNotice(null);
    if (!visible) return;
    const timer = setTimeout(() => {
      const opening = openingPolicy.current.open(initialQuery, autoSendInitialQuery);
      if (opening.welcome) appendMessage({ id: 'cora-welcome', sender: 'cora', language: activeContext.current.language, isWelcome: true,
        text: CORA_WELCOME[activeContext.current.language], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (opening.autoQuery && encounter?.uuid) void sendRef.current(opening.autoQuery, initialMode);
      else setInput(initialQuery || '');
    }, 0);
    return () => { clearTimeout(timer); pendingRequest.current?.abort(); pendingRequest.current = null; stopSpeech(); };
  }, [visible, client, encounter?.uuid, initialQuery, autoSendInitialQuery, initialMode]);

  // A language change from another Cora window must also cancel this request/recognizer.
  useEffect(() => {
    cancelPending(); stopSpeech(); setIsListening(false); setSpeechNotice(null);
    messagesRef.current = messagesRef.current.map(message => message.isWelcome ? { ...message, language, text: CORA_WELCOME[language] } : message);
    setMessages(messagesRef.current);
  }, [language]);

  const handleSend = async (messageText?: string, mode: CoraMode = 'GENERAL') => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || pendingRequest.current || !visible || !encounter?.uuid || textToSend.length > 2000) return;
    const requestLanguage = activeContext.current.language;
    const requestClient = client, requestEncounterId = encounter.uuid;
    const conversation = coraHistory(messagesRef.current);
    const controller = new AbortController();
    pendingRequest.current = controller;
    const isCurrent = () => !controller.signal.aborted && pendingRequest.current === controller && activeContext.current.visible && activeContext.current.language === requestLanguage && activeContext.current.client === requestClient && activeContext.current.encounterId === requestEncounterId;

    const patientMsg: ChatMessage = {
      id: `patient-${Date.now()}`,
      sender: 'patient', language: requestLanguage,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    appendMessage(patientMsg);
    setInput('');
    setLoading(true);

    try {
      const api = createAiApi(client);
      const res: CoraChatResponse = await api.sendCoraMessage(
        textToSend,
        requestLanguage,
        requestEncounterId,
        mode,
        controller.signal,
        conversation
      );

      if (!isCurrent()) return;
      if (res.language && res.language !== requestLanguage) throw new Error('Cora returned a different language. Please try again.');
      const coraMsg: ChatMessage = {
        id: `cora-${Date.now()}`,
        sender: 'cora', language: requestLanguage,
        text: res.reply,
        isNotice: res.scopeDecision === 'OUT_OF_SCOPE' || res.scopeDecision === 'RESTRICTED',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions
      };

      appendMessage(coraMsg);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      if (!isCurrent()) return;
      const errorMsg: ChatMessage = {
        id: `cora-error-${Date.now()}`,
        sender: 'cora', language: requestLanguage,
        isError: true,
        text: err?.message || 'AI generation failed. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      appendMessage(errorMsg);
    } finally {
      if (isCurrent()) { pendingRequest.current = null; setLoading(false); }
    }
  };

  sendRef.current = handleSend;

  const handleVoiceToggle = () => {
    if (typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'fil' || language === 'tl' ? 'fil-PH' : language === 'ilo' ? 'ilo-PH' : 'en-PH';
      const speechContext = activeContext.current;
      const speechCurrent = () => recognitionRef.current === recognition && activeContext.current.visible && activeContext.current.client === speechContext.client && activeContext.current.encounterId === speechContext.encounterId && activeContext.current.language === speechContext.language;
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        if (!speechCurrent()) return;
        setIsListening(true);
        setSpeechNotice('Listening… Speak now.');
      };

      recognition.onresult = (event: any) => {
        if (!speechCurrent()) return;
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          setSpeechNotice(null);
        }
      };

      recognition.onerror = () => {
        if (!speechCurrent()) return;
        setIsListening(false);
        setSpeechNotice('Could not recognize voice. Please type your message.');
        setTimeout(() => setSpeechNotice(null), 3000);
      };

      recognition.onend = () => {
        if (!speechCurrent()) return;
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
    closeAssistant();
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


  const w = encounter?.waterfall;
  const balance = encounter ? remainingBalance(encounter) : 0;

  return (
    <ModalOverlay visible={visible} onRequestClose={closeAssistant} avoidKeyboard
      panelStyle={[styles.modalSheet, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.coraAvatar}>
                <CoraAvatar size={38} />
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
                onPress={closeAssistant}
                accessibilityRole="button"
                accessibilityLabel="Close Cora assistant"
                style={styles.closeButton}
              >
                <X size={20} color={C.secondary} />
              </Pressable>
            </View>

            {/* Language Selector */}
            <View style={styles.langBar} accessibilityRole="radiogroup" accessibilityLabel="Reply language">
              {CORA_LANGUAGE_OPTIONS.map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => changeLanguage(lang)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Reply in ${CORA_LANGUAGE_LABELS[lang]}`}
                  accessibilityState={{ checked: language === lang }}
                  style={[styles.langChip, language === lang && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, language === lang && styles.langChipTextActive]}>
                    {CORA_LANGUAGE_LABELS[lang]}
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
                    <CoraAvatar size={24} />
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
                    {m.isError ? `AI response unavailable: ${m.text}` : m.isNotice ? `Cora notice: ${m.text}` : m.text}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      m.sender === 'patient' ? styles.msgTimePatient : styles.msgTimeCora
                    ]}
                  >
                    {m.sender === 'cora' && !m.isWelcome && !m.isError ? `${CORA_LANGUAGE_LABELS[m.language]} · ${m.timestamp}` : m.timestamp}
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
                  <CoraAvatar size={24} />
                </View>
                <View style={[styles.msgBubble, styles.msgBubbleCora, styles.loadingBubble]}>
                  <CoraTypingDots language={language} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Question Chips */}
          <View style={styles.chipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {CORA_QUESTIONS[language].map((chip, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSend(chip)}
                  accessibilityRole="button"
                  accessibilityLabel={chip}
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
              accessibilityRole="button"
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
                  : language === 'tl'
                  ? 'Magtanong tungkol sa iyong bayarin sa ospital…'
                  : language === 'ilo'
                  ? 'Agdamag ken Cora maipapan ti billing mo…'
                  : 'Ask Cora about your hospital bill…'
              }
              placeholderTextColor={C.faint}
              style={styles.inputField}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              maxLength={2000}
              editable={!loading}
            />

            <Pressable
              onPress={() => handleSend()}
              accessibilityRole="button"
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
    </ModalOverlay>
  );
};

const styles = StyleSheet.create({
  modalSheet: {
    width: '100%',
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
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10
  },
  langChip: {
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
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
