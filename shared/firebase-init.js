// Firebase 共享初始化模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, browserSessionPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKY4sqvwW5QiDly1CUJPuaJgom0Vvjlms",
  authDomain: "yijiao001.firebaseapp.com",
  projectId: "yijiao001",
  storageBucket: "yijiao001.firebasestorage.app",
  messagingSenderId: "877787335721",
  appId: "1:877787335721:web:f9f985efeb2eb24e04a038",
  measurementId: "G-8M231SJG0M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(() => {});
export const db = getFirestore(app);

// 获取当前用户，未登录返回 null
export function getCurrentUser() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => resolve(user), () => resolve(null));
  });
}

// 退出登录
export function logout() {
  return signOut(auth);
}

// 保存报价到 Firestore
window.saveQuoteToFirestore = async function(quoteData, freightData, quoteNumber) {
  const user = await getCurrentUser();
  if (!user) throw new Error('未登录，请重新登录后再试');

  const freightTotal = freightData && freightData.totalPrice ? freightData.totalPrice : 0;
  const doc = {
    quoteNumber: quoteNumber,
    customerName: quoteData.customerName || '',
    userEmail: user.email,
    createdAt: serverTimestamp(),
    svgContent: window._svgContent || '',
    productId: quoteData.productId,
    productName: quoteData.productName,
    usageArea: quoteData.usageArea,
    fontPrices: quoteData.fontPrices || [],
    surfaceColor: quoteData.surfaceColor,
    surfacePrice: quoteData.surfacePrice,
    paint: quoteData.paint,
    paintPrice: quoteData.paintPrice,
    power: quoteData.power,
    powerPrice: quoteData.powerPrice,
    fixing: quoteData.fixing,
    laborFee: quoteData.laborFee || 0,
    totalLetterPrice: quoteData.totalLetterPrice || 0,
    freight: freightTotal > 0 ? {
      destination: freightData.destination || '',
      volumetricWeight: freightData.volumetricWeight || 0,
      chargeableWeight: freightData.chargeableWeight || 0,
      price: freightTotal
    } : null,
    status: 'pending',
    totalPrice: quoteData.totalPrice + freightTotal
  };

  await addDoc(collection(db, 'users', user.uid, 'quotes'), doc);
  console.log('报价已保存:', quoteNumber);

  // Auto-assign customer to this sales person if currently unassigned
  const customerName = quoteData.customerName;
  if (customerName) {
    try {
      const q = query(collection(db, 'clientProfiles'), where('name', '==', customerName));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        if (!d.data().assignedTo) {
          await updateDoc(doc(db, 'clientProfiles', d.id), { assignedTo: user.email });
          console.log('已自动分配客户:', customerName, '→', user.email);
        }
      });
    } catch (e) {
      console.error('自动分配客户失败:', e);
    }
  }
};
