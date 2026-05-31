import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radius, textSize } from '../theme';
import FutureDatePicker from './FutureDatePicker';
import { daysUntilDate } from '../lib/dateUtils';

const PA_STATUSES = [
  { value: 'not_submitted', label: 'Not submitted', color: colors.slateLight, bg: colors.creamMid,    border: colors.border },
  { value: 'pending',       label: 'Pending',        color: colors.amber,      bg: '#1C1508',          border: '#3D2E08' },
  { value: 'approved',      label: 'Approved',       color: colors.sageDark,   bg: colors.sagePale,    border: colors.sageBorder },
  { value: 'denied',        label: 'Denied',         color: colors.terraDark,  bg: colors.terraPale,   border: colors.terraBorder },
  { value: 'expired',       label: 'Expired',        color: colors.terraDark,  bg: colors.terraPale,   border: colors.terraBorder },
];

function formatShortDate(isoDate) {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Self-contained status display + editing. Calls onUpdate(patch) when user saves any change.
// onNavigateToAppeal is optional — shown only when paStatus === 'denied'.
export default function TreatmentStatusSection({ status, onUpdate, onNavigateToAppeal }) {
  const [editPanel, setEditPanel] = useState(null); // null | 'main' | 'pa_expiry' | 'refill'
  const [draftPAStatus, setDraftPAStatus] = useState(status.paStatus);

  const paInfo = PA_STATUSES.find(p => p.value === status.paStatus) || PA_STATUSES[0];
  const paDays = daysUntilDate(status.paExpiryDate);
  const refillDays = daysUntilDate(status.refillDate);
  const paUrgent = (paInfo.value === 'approved' && paDays !== null && paDays <= 14) || paInfo.value === 'denied' || paInfo.value === 'expired';
  const refillUrgent = refillDays !== null && refillDays <= 7;

  function openMain() {
    setDraftPAStatus(status.paStatus);
    setEditPanel('main');
  }

  function saveMain() {
    onUpdate({
      paStatus: draftPAStatus,
      paExpiryDate: draftPAStatus !== 'approved' ? null : status.paExpiryDate,
    });
    setEditPanel(null);
  }

  function urgentAlertText() {
    if (paInfo.value === 'denied') return 'Prior auth was denied — discuss next steps with your doctor.';
    if (paInfo.value === 'expired') return 'Prior authorization has expired — renewal needed.';
    if (paDays !== null && paDays <= 14 && paInfo.value === 'approved') return `PA expires in ${paDays} day${paDays === 1 ? '' : 's'} — contact your insurer to renew.`;
    if (refillUrgent && refillDays >= 0) return `Refill due in ${refillDays} day${refillDays === 1 ? '' : 's'}.`;
    return 'Refill is overdue.';
  }

  return (
    <>
      <View style={[styles.card, (paUrgent || refillUrgent) && styles.cardUrgent]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Feather name="shield" size={14} color={colors.slateMid} />
          </View>
          <Text style={styles.cardTitle}>Treatment Access</Text>
          <TouchableOpacity onPress={openMain} accessibilityRole="button" accessibilityLabel="Edit treatment access details">
            <Text style={styles.editTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.itemLabel}>Prior Auth</Text>
            <View style={[styles.pill, { backgroundColor: paInfo.bg, borderColor: paInfo.border }]}>
              <Text style={[styles.pillTxt, { color: paInfo.color }]}>{paInfo.label}</Text>
            </View>
            {status.paExpiryDate && paInfo.value === 'approved' && (
              <Text style={[styles.dueDate, paDays !== null && paDays <= 14 && { color: colors.terraDark }]}>
                {paDays === 0 ? 'Expires today' : paDays < 0 ? 'Expired' : `Expires ${formatShortDate(status.paExpiryDate)}`}
                {paDays !== null && paDays > 0 && paDays <= 14 ? ` · ${paDays}d` : ''}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.statusItem}>
            <Text style={styles.itemLabel}>Next Refill</Text>
            {status.refillDate ? (
              <>
                <Text style={[styles.refillDate, refillUrgent && { color: colors.terraDark }]}>
                  {formatShortDate(status.refillDate)}
                </Text>
                {refillDays !== null && (
                  <Text style={[styles.dueDate, refillUrgent && { color: colors.terraDark }]}>
                    {refillDays === 0 ? 'Due today' : refillDays < 0 ? `${Math.abs(refillDays)}d overdue` : `in ${refillDays}d`}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.notSet}>Not set</Text>
            )}
          </View>
        </View>

        {(paUrgent || refillUrgent) && (
          <View style={styles.alert}>
            <Feather name="alert-circle" size={13} color={colors.terra} />
            <Text style={styles.alertTxt}>{urgentAlertText()}</Text>
          </View>
        )}

        {status.paStatus === 'denied' && onNavigateToAppeal && (
          <TouchableOpacity
            style={styles.appealBtn}
            onPress={onNavigateToAppeal}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Draft appeal letter"
          >
            <Text style={styles.appealBtnTxt}>Draft appeal letter →</Text>
          </TouchableOpacity>
        )}
      </View>

      {editPanel === 'main' && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Prior Authorization</Text>
          <View style={styles.paOptions}>
            {PA_STATUSES.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paOpt, draftPAStatus === opt.value && { borderColor: opt.border, backgroundColor: opt.bg }]}
                onPress={() => setDraftPAStatus(opt.value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: draftPAStatus === opt.value }}
              >
                <Text style={[styles.paOptTxt, draftPAStatus === opt.value && { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {draftPAStatus === 'approved' && (
            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => setEditPanel('pa_expiry')}
              accessibilityRole="button"
              accessibilityLabel="Set PA expiry date"
            >
              <Text style={styles.dateRowLabel}>PA expiry date</Text>
              <Text style={styles.dateRowValue}>{status.paExpiryDate ? formatShortDate(status.paExpiryDate) : 'Tap to set'}</Text>
              <Feather name="chevron-right" size={15} color={colors.lav} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setEditPanel('refill')}
            accessibilityRole="button"
            accessibilityLabel="Set refill date"
          >
            <Text style={styles.dateRowLabel}>Next refill date</Text>
            <Text style={styles.dateRowValue}>{status.refillDate ? formatShortDate(status.refillDate) : 'Tap to set'}</Text>
            <Feather name="chevron-right" size={15} color={colors.lav} />
          </TouchableOpacity>

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveMain} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel="Save">
              <Text style={styles.saveTxt}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditPanel(null)} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {editPanel === 'pa_expiry' && (
        <FutureDatePicker
          label="PA expiry date"
          date={status.paExpiryDate}
          onSave={iso => { setEditPanel('main'); onUpdate({ paExpiryDate: iso }); }}
          onCancel={() => setEditPanel('main')}
        />
      )}

      {editPanel === 'refill' && (
        <FutureDatePicker
          label="Next refill date"
          date={status.refillDate}
          onSave={iso => { setEditPanel('main'); onUpdate({ refillDate: iso }); }}
          onCancel={() => setEditPanel('main')}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  cardUrgent: { borderColor: colors.terraBorder, backgroundColor: colors.terraPale },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, flex: 1 },
  editTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.lav },
  statusRow: { flexDirection: 'row' },
  statusItem: { flex: 1, paddingHorizontal: 4 },
  divider: { width: 1, backgroundColor: colors.border, marginVertical: 2, marginHorizontal: 8 },
  itemLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.fine,
    color: colors.slateLight, marginBottom: 6, letterSpacing: 0.3,
  },
  pill: {
    borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, alignSelf: 'flex-start', marginBottom: 4,
  },
  pillTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine },
  dueDate: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  refillDate: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 2 },
  notSet: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight },
  alert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.terraBorder,
  },
  alertTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.terraDark, flex: 1, lineHeight: 20 },
  appealBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.slateLight,
    borderRadius: radius.full,
  },
  appealBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.slateLight },

  editCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, marginBottom: 10,
  },
  editTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 10 },
  paOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  paOpt: {
    paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1.5,
    borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white,
  },
  paOptTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.creamMid,
  },
  dateRowLabel: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, flex: 1 },
  dateRowValue: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav, marginRight: 6 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  saveBtn: {
    flex: 1, backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 11, alignItems: 'center',
  },
  saveTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 14, justifyContent: 'center' },
  cancelTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight },
});
