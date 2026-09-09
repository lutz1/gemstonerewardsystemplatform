import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAwOhMejaDvgaYYahKCnk4KaCWqqrwd6ek',
  authDomain: 'gemstonerewardsystemplat-27d57.firebaseapp.com',
  databaseURL: 'https://gemstonerewardsystemplat-27d57-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'gemstonerewardsystemplat-27d57',
  storageBucket: 'gemstonerewardsystemplat-27d57.firebasestorage.app',
  messagingSenderId: '772836875707',
  appId: '1:772836875707:web:b20c07595fce0f9401b89e',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

export { app, auth }

