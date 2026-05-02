import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PeriodoPlanejamento } from '../types';

const KEY = '@config';

export function useConfiguracao() {
  const [periodo, setPeriodoState] = useState<PeriodoPlanejamento>('semanal');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((json) => {
      if (json) {
        const config = JSON.parse(json);
        if (config.periodo) setPeriodoState(config.periodo);
      }
    });
  }, []);

  const setPeriodo = useCallback((p: PeriodoPlanejamento) => {
    setPeriodoState(p);
    AsyncStorage.getItem(KEY).then((json) => {
      const config = json ? JSON.parse(json) : {};
      AsyncStorage.setItem(KEY, JSON.stringify({ ...config, periodo: p }));
    });
  }, []);

  return { periodo, setPeriodo };
}
