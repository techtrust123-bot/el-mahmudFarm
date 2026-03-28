import { createContext, useState } from "react";
import axios from 'axios';

export const AuthContext = createContext()

export const AuthProvider = (props) =>{
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const [isLogin, setIsLogin] = useState(false)
  const [userData, setUserData] = useState(false)

  const getUserData = async()=>{
    try {
      const res = await axios.get(backendUrl + '/api/user/userData', { withCredentials: true })
      if (res.data.success) {
        setUserData(res.data.userData)
      } else {
        alert(res.data.message)
      }
    } catch (error) {
      console.log(error)
    }
  }
  const value ={
    isLogin,setIsLogin,
    userData,setUserData,
    getUserData,
    backendUrl
  }

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  )
}