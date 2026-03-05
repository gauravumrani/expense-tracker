import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const EXPENSES_COLLECTION = 'expenses';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app';
const HOUSE_HELP_COLLECTION = 'houseHelp';

const defaultCategories = ['Grocery', 'Fuel', 'Misc', 'Food'];
const defaultUsers = ['Gaurav', 'Dolly'];

export const defaultHouseHelpRates = {
  cookPerPerson: 34.32,
  maidMorningBase: 50,
  maidMorningPerPerson: 5,
  maidEveningPerPerson: 5,
  milk1L: 60,
  milkHalfL: 30,
  paneer: 32,
};

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setExpenses(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const addExpense = async (expense) => {
    const { id, ...data } = expense;
    await addDoc(collection(db, EXPENSES_COLLECTION), {
      ...data,
      amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount),
    });
  };

  return { expenses, loading, error, addExpense };
}

export function useSettings() {
  const [categories, setCategoriesState] = useState(defaultCategories);
  const [users, setUsersState] = useState(defaultUsers);
  const [houseHelpRates, setHouseHelpRatesState] = useState(defaultHouseHelpRates);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);

  useEffect(() => {
    const unsub = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.categories && data.categories.length) setCategoriesState(data.categories);
          if (data.users && data.users.length) setUsersState(data.users);
          if (data.houseHelpRates && typeof data.houseHelpRates === 'object') {
            setHouseHelpRatesState({ ...defaultHouseHelpRates, ...data.houseHelpRates });
          }
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const setCategories = async (newCategories) => {
    await setDoc(
      settingsRef,
      { categories: newCategories, users },
      { merge: true }
    );
  };

  const setUsers = async (newUsers) => {
    await setDoc(
      settingsRef,
      { categories, users: newUsers },
      { merge: true }
    );
  };

  const setHouseHelpRates = async (newRates) => {
    await setDoc(
      settingsRef,
      { houseHelpRates: newRates },
      { merge: true }
    );
    setHouseHelpRatesState({ ...defaultHouseHelpRates, ...newRates });
  };

  return {
    categories,
    users,
    houseHelpRates,
    setCategories,
    setUsers,
    setHouseHelpRates,
    loading,
    error,
  };
}

export function useHouseHelp() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, HOUSE_HELP_COLLECTION),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setDays(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const saveHouseHelpDay = async (dateStr, data) => {
    const ref = doc(db, HOUSE_HELP_COLLECTION, dateStr);
    await setDoc(ref, { date: dateStr, ...data }, { merge: true });
  };

  const deleteHouseHelpDay = async (dateStr) => {
    const ref = doc(db, HOUSE_HELP_COLLECTION, dateStr);
    await deleteDoc(ref);
  };

  return { days, loading, error, saveHouseHelpDay, deleteHouseHelpDay };
}

export { defaultCategories, defaultUsers };
