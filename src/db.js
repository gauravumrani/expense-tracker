import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const EXPENSES_COLLECTION = 'expenses';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app';

const defaultCategories = ['Grocery', 'Fuel', 'Misc', 'Food'];
const defaultUsers = ['Gaurav', 'Dolly'];

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

  return {
    categories,
    users,
    setCategories,
    setUsers,
    loading,
    error,
  };
}

export { defaultCategories, defaultUsers };
