// src/features/workouts/components/SearchBar.jsx
// Поиск по названию с задержкой 300 мс.

import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { IconSearch } from './icons'
import { colors, radius, spacing, F } from '../theme'

const DEBOUNCE_MS = 300

export function SearchBar({ placeholder, value, onChangeDebounced }) {
  const [local, setLocal] = useState(value)
  const timer = useRef(null)

  // Синхронизация при сбросе фильтров извне
  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const handleChange = (text) => {
    setLocal(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChangeDebounced(text), DEBOUNCE_MS)
  }

  return (
    <View style={styles.box}>
      <IconSearch />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text3}
        value={local}
        onChangeText={handleChange}
        returnKeyType="search"
        accessible
        accessibilityLabel={placeholder}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s + 2,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: spacing.l,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontFamily: F[400],
    padding: 0,
    minHeight: 22,
  },
})
