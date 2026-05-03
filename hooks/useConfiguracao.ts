import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PeriodoPlanejamento } from '../types';

const KEY = '@config';

export type DiaInicio = 'seg' | 'dom';

export function useConfiguracao() {
  const [periodo, setPeriodoState] = useState<PeriodoPlanejamento>('semanal');
  const [diaInicio, setDiaInicioState] = useState<DiaInicio>('seg');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((json) => {
      if (json) {
        const config = JSON.parse(json);
        if (config.periodo) setPeriodoState(config.periodo);
        if (config.diaInicio) setDiaInicioState(config.diaInicio);
      }
    });
  }, []);

  const salvarConfig = useCallback(async (updates: Partial<{ periodo: PeriodoPlanejamento; diaInicio: DiaInicio }>) => {
    const json = await AsyncStorage.getItem(KEY);
    const config = json ? JSON.parse(json) : {};
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...config, ...updates }));
  }, []);

  const setPeriodo = useCallback((p: PeriodoPlanejamento) => {
    setPeriodoState(p);
    salvarConfig({ periodo: p });
  }, [salvarConfig]);

  const setDiaInicio = useCallback((d: DiaInicio) => {
    setDiaInicioState(d);
    salvarConfig({ diaInicio: d });
  }, [salvarConfig]);

  const recarregar = useCallback(async () => {
    const json = await AsyncStorage.getItem(KEY);
    if (json) {
      const config = JSON.parse(json);
      if (config.periodo) setPeriodoState(config.periodo);
      if (config.diaInicio) setDiaInicioState(config.diaInicio);
    }
  }, []);

  return { periodo, setPeriodo, diaInicio, setDiaInicio, recarregar };
}
