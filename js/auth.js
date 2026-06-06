// auth.js — Login / logout / session management
window.Auth = (function(){
  let _user = null;
  let _clinician = null;

  async function init(){
    const {data:{session}} = await db.auth.getSession();
    if(session) {
      _user = session.user;
      _clinician = await DB.getClinician(_user.id).catch(()=>null);
    }
    db.auth.onAuthStateChange(async (_event, session)=>{
      _user = session?.user || null;
      if(_user) _clinician = await DB.getClinician(_user.id).catch(()=>null);
      else _clinician = null;
      App.renderRoot();
    });
  }

  async function login(email, password){
    const {data,error} = await db.auth.signInWithPassword({email,password});
    if(error) throw error;
    return data;
  }

  async function signUp(email, password, info){
    const {data,error} = await db.auth.signUp({email,password});
    if(error) throw error;
    if(data.user){
      await DB.saveClinician(data.user.id, info);
      _clinician = info;
    }
    return data;
  }

  async function logout(){
    await db.auth.signOut();
  }

  async function resetPassword(email){
    const {error} = await db.auth.resetPasswordForEmail(email);
    if(error) throw error;
  }

  return {
    init,
    login,
    signUp,
    logout,
    resetPassword,
    getUser:       ()=>_user,
    getClinician:  ()=>_clinician,
    isLoggedIn:    ()=>!!_user,
    refreshClinician: async()=>{ if(_user) _clinician = await DB.getClinician(_user.id); },
  };
})();
