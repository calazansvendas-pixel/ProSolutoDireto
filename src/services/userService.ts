import { UserProfile, UserRole, UserStatus } from '../types';
import { db, auth } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const USERS_STORAGE_KEY = 'prosoluto_firestore_users';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_admin_01',
    uid: 'usr_admin_01',
    name: 'Administrador Principal',
    email: 'carlos.admin@morar.com.br',
    role: 'admin',
    status: 'Ativo',
    isMainAdmin: true,
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    empreendimentoPadrao: 'Residencial Morar',
  },
  {
    id: 'usr_gerente_01',
    uid: 'usr_gerente_01',
    name: 'João da Silva',
    email: 'joao.silva@morar.com.br',
    role: 'gerente',
    status: 'Ativo',
    isMainAdmin: false,
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    empreendimentoPadrao: 'Residencial Morar',
  },
  {
    id: 'usr_corretor_01',
    uid: 'usr_corretor_01',
    name: 'Maria Souza',
    email: 'maria.souza@gmail.com',
    role: 'corretor',
    status: 'Pendente',
    isMainAdmin: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'usr_corretor_02',
    uid: 'usr_corretor_02',
    name: 'Pedro Alves',
    email: 'pedro.alves@gmail.com',
    role: 'corretor',
    status: 'Pausado',
    isMainAdmin: false,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];

export function getStoredUsers(): UserProfile[] {
  try {
    const data = typeof window !== 'undefined' ? localStorage.getItem(USERS_STORAGE_KEY) : null;
    if (data && data.trim() !== '' && data !== '[]' && data !== 'null') {
      const parsed: UserProfile[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Guarantee admin user carlos.admin@morar.com.br is present
        const hasAdmin = parsed.some((u) => u.email.toLowerCase() === 'carlos.admin@morar.com.br');
        if (!hasAdmin) {
          const merged = [INITIAL_USERS[0], ...parsed];
          saveUsersList(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse users list', e);
  }
  saveUsersList(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveUsersList(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users list', e);
  }
}

// Fetch all users from Firestore with localStorage fallback
export async function fetchUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    if (!snapshot.empty) {
      const fsUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fsUsers.push({
          id: docSnap.id,
          uid: docSnap.id,
          name: data.name || data.nome || 'Usuário Sem Nome',
          email: data.email || '',
          role: (data.role || data.perfil || 'corretor').toLowerCase() as UserRole,
          status: (data.status || 'Pendente') as UserStatus,
          isMainAdmin: data.isMainAdmin || data.email === 'carlos.admin@morar.com.br',
          createdAt: data.createdAt || new Date().toISOString(),
          empreendimentoPadrao: data.empreendimentoPadrao,
          cpf: data.cpf || '',
          phone: data.phone || data.telefone || '',
          creci: data.creci || '',
          imobiliaria: data.imobiliaria || data.agency || '',
        });
      });
      saveUsersList(fsUsers);
      return fsUsers;
    }
  } catch (e) {
    console.warn('Firestore fetchUsers failed or offline, using local storage fallback:', e);
  }

  return getStoredUsers();
}

// Save a single user profile to Firestore
export async function syncUserToFirestore(user: UserProfile): Promise<void> {
  try {
    const docId = user.uid || user.id;
    const userRef = doc(db, 'users', docId);
    await setDoc(
      userRef,
      {
        uid: docId,
        id: docId,
        nome: user.name,
        name: user.name,
        email: user.email.toLowerCase(),
        perfil: user.role,
        role: user.role,
        status: user.status,
        isMainAdmin: user.isMainAdmin || user.email === 'carlos.admin@morar.com.br',
        createdAt: user.createdAt || new Date().toISOString(),
        cpf: user.cpf || '',
        phone: user.phone || '',
        creci: user.creci || '',
        imobiliaria: user.imobiliaria || '',
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to sync user to Firestore:', e);
  }
}

// Register public user in Firebase Auth & Firestore
export async function registerPublicUserAsync(data: {
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  phone?: string;
  creci?: string;
  imobiliaria?: string;
}): Promise<UserProfile> {
  const normalizedEmail = data.email.trim().toLowerCase();
  let uid = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  // Try creating Firebase Auth account if password provided
  if (data.password && data.password.length >= 6) {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
      uid = userCred.user.uid;
    } catch (authError: any) {
      console.warn('Firebase Auth createUser notice:', authError?.message || authError);
    }
  }

  const newUser: UserProfile = {
    id: uid,
    uid: uid,
    name: data.name.trim(),
    email: normalizedEmail,
    role: 'corretor', // ALWAYS 'corretor'
    status: 'Pendente', // ALWAYS 'Pendente'
    isMainAdmin: false,
    createdAt: new Date().toISOString(),
    cpf: data.cpf,
    phone: data.phone,
    creci: data.creci,
    imobiliaria: data.imobiliaria,
  };

  // Sync to Firestore
  await syncUserToFirestore(newUser);

  // Sync to local storage
  const users = getStoredUsers();
  const updated = [newUser, ...users.filter((u) => u.email.toLowerCase() !== normalizedEmail)];
  saveUsersList(updated);

  return newUser;
}

export function registerPublicUser(data: {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  creci?: string;
  imobiliaria?: string;
}): UserProfile {
  const users = getStoredUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return existing;
  }

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    uid: `usr_${Date.now()}`,
    name: data.name.trim(),
    email: normalizedEmail,
    role: 'corretor',
    status: 'Pendente',
    isMainAdmin: false,
    createdAt: new Date().toISOString(),
    cpf: data.cpf,
    phone: data.phone,
    creci: data.creci,
    imobiliaria: data.imobiliaria,
  };

  const updated = [newUser, ...users];
  saveUsersList(updated);
  
  // Fire and forget Firestore sync
  syncUserToFirestore(newUser).catch(() => {});

  return newUser;
}

export interface AuthResult {
  success: boolean;
  statusBlocked?: boolean;
  userNotFound?: boolean;
  user?: UserProfile;
  message?: string;
}

export async function authenticateUserAsync(identifier: string, password?: string): Promise<AuthResult> {
  const clean = identifier.trim().toLowerCase();

  // Try signing in via Firebase Auth if password exists
  if (password) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, clean, password);
      const authUid = userCred.user.uid;

      // Check user doc in Firestore
      const userDocRef = doc(db, 'users', authUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const userProfile: UserProfile = {
          id: authUid,
          uid: authUid,
          name: data.name || data.nome || clean.split('@')[0],
          email: data.email || clean,
          role: (data.role || data.perfil || 'corretor').toLowerCase() as UserRole,
          status: (data.status || 'Pendente') as UserStatus,
          isMainAdmin: data.isMainAdmin || clean === 'carlos.admin@morar.com.br',
          createdAt: data.createdAt,
          cpf: data.cpf || '',
          phone: data.phone || data.telefone || '',
          creci: data.creci || '',
          imobiliaria: data.imobiliaria || data.agency || '',
        };

        // CHECK STATUS
        if (userProfile.status === 'Pendente' || userProfile.status === 'Pausado') {
          await signOut(auth); // Sign out immediately if pending or paused
          return {
            success: false,
            statusBlocked: true,
            user: userProfile,
            message:
              'Seu cadastro continua pendente de aprovação pelo administrador. Por favor, aguarde a liberação para acessar o app.',
          };
        }

        return {
          success: true,
          user: userProfile,
        };
      }
    } catch (e: any) {
      console.warn('Firebase Auth signIn notice, checking Firestore/Local fallback:', e?.message || e);
    }
  }

  // Check Firestore by email or local storage
  try {
    const q = query(collection(db, 'users'), where('email', '==', clean));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const userProfile: UserProfile = {
        id: docSnap.id,
        uid: docSnap.id,
        name: data.name || data.nome || clean.split('@')[0],
        email: data.email || clean,
        role: (data.role || data.perfil || 'corretor').toLowerCase() as UserRole,
        status: (data.status || 'Pendente') as UserStatus,
        isMainAdmin: data.isMainAdmin || clean === 'carlos.admin@morar.com.br',
        createdAt: data.createdAt,
        cpf: data.cpf || '',
        phone: data.phone || data.telefone || '',
        creci: data.creci || '',
        imobiliaria: data.imobiliaria || data.agency || '',
      };

      if (userProfile.status === 'Pendente' || userProfile.status === 'Pausado') {
        return {
          success: false,
          statusBlocked: true,
          user: userProfile,
          message:
            'Seu cadastro continua pendente de aprovação pelo administrador. Por favor, aguarde a liberação para acessar o app.',
        };
      }

      return {
        success: true,
        user: userProfile,
      };
    }
  } catch (err) {
    console.warn('Firestore user query fallback:', err);
  }

  // Local storage fallback
  return authenticateUser(identifier);
}

export function authenticateUser(identifier: string): AuthResult {
  const users = getStoredUsers();
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = clean.replace(/\D/g, '');

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === clean ||
      (cleanDigits.length >= 11 && u.cpf && u.cpf.replace(/\D/g, '') === cleanDigits) ||
      (clean.length >= 3 && u.name.toLowerCase() === clean) ||
      (clean.length >= 3 && u.email.toLowerCase().split('@')[0] === clean)
  );

  if (!user) {
    return {
      success: false,
      userNotFound: true,
      message: 'E-mail não cadastrado no sistema. Por favor, clique em "Cadastrar como Corretor" para solicitar seu acesso.',
    };
  }

  // CHECK USER STATUS FOR ACCESS BLOCK
  if (user.status === 'Pendente' || user.status === 'Pausado') {
    return {
      success: false,
      statusBlocked: true,
      user,
      message:
        'Seu cadastro continua pendente de aprovação pelo administrador. Por favor, aguarde a liberação para acessar o app.',
    };
  }

  return {
    success: true,
    user,
  };
}

export async function updateUserStatusAsync(userId: string, newStatus: UserStatus): Promise<UserProfile[]> {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id === userId || u.uid === userId) {
      if (u.isMainAdmin || u.email === 'carlos.admin@morar.com.br') {
        return u; // SECURITY RULE: Main admin account CANNOT be paused or changed
      }
      return { ...u, status: newStatus };
    }
    return u;
  });

  saveUsersList(updated);

  // Sync update to Firestore
  try {
    const targetUser = updated.find((u) => u.id === userId || u.uid === userId);
    if (targetUser && !targetUser.isMainAdmin && targetUser.email !== 'carlos.admin@morar.com.br') {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { status: newStatus });
    }
  } catch (e) {
    console.warn('Firestore updateUserStatus update error:', e);
  }

  return updated;
}

export function updateUserStatus(userId: string, newStatus: UserStatus): UserProfile[] {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id === userId || u.uid === userId) {
      if (u.isMainAdmin || u.email === 'carlos.admin@morar.com.br') {
        return u;
      }
      return { ...u, status: newStatus };
    }
    return u;
  });

  saveUsersList(updated);
  
  updateUserStatusAsync(userId, newStatus).catch(() => {});
  return updated;
}

export async function updateUserRoleAsync(userId: string, newRole: UserRole): Promise<UserProfile[]> {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id === userId || u.uid === userId) {
      return { ...u, role: newRole };
    }
    return u;
  });

  saveUsersList(updated);

  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { role: newRole, perfil: newRole });
  } catch (e) {
    console.warn('Firestore updateUserRole update error:', e);
  }

  return updated;
}

export function updateUserRole(userId: string, newRole: UserRole): UserProfile[] {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id === userId || u.uid === userId) {
      return { ...u, role: newRole };
    }
    return u;
  });

  saveUsersList(updated);
  updateUserRoleAsync(userId, newRole).catch(() => {});
  return updated;
}

export async function createUserByAdminAsync(data: {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}): Promise<UserProfile[]> {
  const users = getStoredUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return users;
  }

  const docId = `usr_adm_${Date.now()}`;
  const newUser: UserProfile = {
    id: docId,
    uid: docId,
    name: data.name.trim(),
    email: normalizedEmail,
    role: data.role,
    status: data.status,
    isMainAdmin: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [newUser, ...users];
  saveUsersList(updated);

  await syncUserToFirestore(newUser);
  return updated;
}

export function createUserByAdmin(data: {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}): UserProfile[] {
  const users = getStoredUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return users;
  }

  const docId = `usr_adm_${Date.now()}`;
  const newUser: UserProfile = {
    id: docId,
    uid: docId,
    name: data.name.trim(),
    email: normalizedEmail,
    role: data.role,
    status: data.status,
    isMainAdmin: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [newUser, ...users];
  saveUsersList(updated);

  syncUserToFirestore(newUser).catch(() => {});
  return updated;
}

export async function deleteUserAsync(userId: string): Promise<UserProfile[]> {
  const users = getStoredUsers();
  const updated = users.filter((u) => {
    if ((u.id === userId || u.uid === userId) && (u.isMainAdmin || u.email === 'carlos.admin@morar.com.br')) {
      return true; // Keep
    }
    return u.id !== userId && u.uid !== userId;
  });

  saveUsersList(updated);

  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore deleteUser error:', e);
  }

  return updated;
}

export function deleteUser(userId: string): UserProfile[] {
  const users = getStoredUsers();
  const updated = users.filter((u) => {
    if ((u.id === userId || u.uid === userId) && (u.isMainAdmin || u.email === 'carlos.admin@morar.com.br')) {
      return true;
    }
    return u.id !== userId && u.uid !== userId;
  });

  saveUsersList(updated);
  deleteUserAsync(userId).catch(() => {});
  return updated;
}
