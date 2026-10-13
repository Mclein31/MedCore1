import { ModalOverlay } from './ModalOverlay';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { cardImageDataUri } from '../lib/benefitCardImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, AlertCircle, X, Sparkles, Upload } from './SolarIcons';
import { C, Spacing, Radius } from './theme';
import { useAuth } from '../lib/auth';
import { createAiApi, CardOcrResponse } from '../services/aiApi';

export interface BenefitCardScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onCardExtracted?: (cardData: CardOcrResponse) => void;
  preferredCategory?: 'PHILHEALTH' | 'SENIOR_CITIZEN' | 'PWD' | 'HMO' | 'PHILSYS_NATIONAL_ID';
}

export const BenefitCardScannerModal: React.FC<BenefitCardScannerModalProps> = ({
  visible,
  onClose,
  onCardExtracted,
  preferredCategory
}) => {
  const insets = useSafeAreaInsets();
  const { client } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>(preferredCategory || 'ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<CardOcrResponse | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const activeSelection = useRef(0);

  useEffect(() => {
    activeSelection.current++;
    pendingRequest.current?.abort();
    setLoading(false); setExtractedData(null); setError(null);
    if (visible) setSelectedCategory(preferredCategory || 'ALL');
    return () => { activeSelection.current++; pendingRequest.current?.abort(); };
  }, [visible, preferredCategory, client]);

  const processImageBase64 = async (base64Data: string, selection: number) => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading(true); setError(null); setExtractedData(null);
    try {
      const res = await createAiApi(client).scanBenefitCard(base64Data,
        selectedCategory !== 'ALL' ? selectedCategory : undefined, controller.signal);
      if (controller.signal.aborted || selection !== activeSelection.current) return;
      if (res.cardType === 'UNKNOWN' || !res.idNumber?.trim() || !res.memberFullName?.trim()) {
        throw new Error('No readable benefit card was found. Select a clear photo of the card.');
      }
      setExtractedData(res);
    } catch (err: any) {
      if (!controller.signal.aborted && selection === activeSelection.current) setError(err?.message || 'Card extraction failed. Please choose a clearer photo.');
    } finally {
      if (!controller.signal.aborted && selection === activeSelection.current) setLoading(false);
    }
  };

  const handleSelectFile = async () => {
    const selection = ++activeSelection.current;
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], base64: true, quality: 1, allowsEditing: false
      });
      if (result.canceled || selection !== activeSelection.current) return;
      await processImageBase64(cardImageDataUri(result.assets[0]), selection);
    } catch (err: any) {
      if (selection === activeSelection.current) setError(err?.message || 'The selected photo could not be opened.');
    }
  };

  const handleReset = () => {
    setExtractedData(null);
    setError(null);
  };


  return (
    <ModalOverlay visible={visible} onRequestClose={onClose}
      panelStyle={[styles.modalSheet, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Scan Benefit Card / Gov ID</Text>
                <Text style={styles.headerSub}>Multimodal OCR with Gemini Vision</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={C.secondary} />
              </Pressable>
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {[
                { id: 'ALL', label: 'Auto Detect' },
                { id: 'PHILHEALTH', label: 'PhilHealth PIN' },
                { id: 'SENIOR_CITIZEN', label: 'Senior Citizen OSCA' },
                { id: 'PWD', label: 'PWD ID' },
                { id: 'HMO', label: 'HMO Card' },
                { id: 'PHILSYS_NATIONAL_ID', label: 'PhilSys National ID' }
              ].map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    activeSelection.current++; pendingRequest.current?.abort();
                    setSelectedCategory(cat.id); setExtractedData(null); setError(null); setLoading(false);
                  }}
                  style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.bodyContainer}>
            {!extractedData && !loading && (
              <View style={styles.uploadArea}>
                <View style={styles.cameraIconSurround}>
                  <Camera size={36} color={C.brand} />
                </View>
                <Text style={styles.uploadTitle}>Position card or upload photo</Text>
                <Text style={styles.uploadSubtitle}>
                  Supports PhilHealth Member Data Record, Senior Citizen OSCA ID, PWD ID, PhilSys National ID, or commercial HMO card.
                </Text>

                <Pressable onPress={() => void handleSelectFile()} style={styles.uploadButton}>
                  <Upload size={18} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Select Card Image</Text>
                </Pressable>
              </View>
            )}

            {loading && (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="large" color={C.brand} />
                <Text style={styles.loadingTitle}>Extracting card credentials…</Text>
                <Text style={styles.loadingSubtitle}>
                  Analyzing Member ID, Name, Validity, and Statutory Authority
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorCard}>
                <AlertCircle size={20} color={C.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Scanning Failed</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </View>
            )}

            {extractedData && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 size={15} color="#15803D" />
                    <Text style={styles.verifiedText}>Extracted — review details</Text>
                  </View>
                  <Text style={styles.confidenceText}>
                    {Math.round(extractedData.confidenceScore * 100)}% Confidence
                  </Text>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Card Category</Text>
                  <Text style={styles.fieldValueBold}>{extractedData.cardType.replace(/_/g, ' ')}</Text>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>ID / PIN Number</Text>
                  <Text style={styles.fieldMono}>{extractedData.idNumber}</Text>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Member Full Name</Text>
                  <Text style={styles.fieldValue}>{extractedData.memberFullName}</Text>
                </View>

                {extractedData.providerName && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Provider / Issuer</Text>
                    <Text style={styles.fieldValue}>{extractedData.providerName}</Text>
                  </View>
                )}

                {extractedData.validUntil && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Valid Through</Text>
                    <Text style={styles.fieldValue}>{extractedData.validUntil}</Text>
                  </View>
                )}

                <View style={styles.resultActions}>
                  <Pressable onPress={handleReset} style={styles.secondaryAction}>
                    <Text style={styles.secondaryActionText}>Scan Another</Text>
                  </Pressable>
                  <Pressable onPress={() => { if (extractedData) onCardExtracted?.(extractedData); onClose(); }} style={styles.primaryAction}>
                    <Text style={styles.primaryActionText}>{onCardExtracted ? 'Use These Details' : 'Done'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
    </ModalOverlay>
  );
};

const styles = StyleSheet.create({
  modalSheet: {
    width: '100%',
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    height: '85%',
    maxHeight: 680,
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
  iconCircle: {
    width: 36,
    height: 36,
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
  headerSub: {
    fontSize: 11,
    color: C.secondary,
    marginTop: 1
  },
  closeButton: {
    padding: 6,
    borderRadius: 8
  },
  categoryScroll: {
    paddingTop: 10,
    gap: 6
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border
  },
  categoryChipActive: {
    backgroundColor: C.brandSoft,
    borderColor: C.brand
  },
  categoryChipText: {
    fontSize: 11,
    color: C.secondary,
    fontWeight: '600'
  },
  categoryChipTextActive: {
    color: C.brandDark,
    fontWeight: '700'
  },
  scrollBody: {
    flex: 1
  },
  bodyContainer: {
    padding: Spacing.gutter,
    gap: 16
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  cameraIconSurround: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center'
  },
  uploadSubtitle: {
    fontSize: 12,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 16
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.brand,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.control,
    marginTop: 18
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  loadingArea: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginTop: 14
  },
  loadingSubtitle: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 4,
    textAlign: 'center'
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 12,
    borderRadius: Radius.surface
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F1239'
  },
  errorText: {
    fontSize: 11,
    color: '#BE123C',
    marginTop: 2
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    gap: 10
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 10
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D'
  },
  confidenceText: {
    fontSize: 11,
    color: C.faint,
    fontWeight: '600'
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  fieldLabel: {
    fontSize: 12,
    color: C.secondary
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.ink
  },
  fieldValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: C.brandDark
  },
  fieldMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: C.ink,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12
  },
  secondaryAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.control,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary
  },
  primaryAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.control,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
