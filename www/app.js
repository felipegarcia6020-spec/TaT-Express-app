import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, doc, setDoc } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const viewLogin = document.getElementById('view-login');
    const appMainLayout = document.getElementById('app-main-layout');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const btnShowRegister = document.getElementById('show-register');
    const btnShowLogin = document.getElementById('show-login');

    // Cambiar entre vistas de Login y Registro si existen los botones
    if (btnShowRegister && btnShowLogin) {
        btnShowRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
        });

        btnShowLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerForm) registerForm.classList.add('hidden');
            if (loginForm) loginForm.classList.remove('hidden');
        });
    }

    // Manejar el formulario de Inicio de Sesión
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                alert("¡Bienvenido, " + userCredential.user.email + "!");
                
                // Cambiar a la vista principal de la app
                if (viewLogin) viewLogin.classList.add('hidden');
                if (appMainLayout) appMainLayout.classList.remove('hidden');
            } catch (error) {
                alert("Error al iniciar sesión: " + error.message);
            }
        });
    }

    // Manejar el formulario de Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            // Si tienes un selector de rol en tu HTML, lo capturamos; si no, por defecto es 'conductor'
            const roleSelect = document.getElementById('register-role');
            const rol = roleSelect ? roleSelect.value : 'conductor';

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Guardar datos adicionales y el rol en Cloud Firestore
                await setDoc(doc(db, "usuarios", user.uid), {
                    email: email,
                    role: rol,
                    createdAt: new Date().toISOString()
                });

                alert("¡Registro exitoso en la nube! Ya puedes iniciar sesión.");
                
                // Regresar al formulario de login
                registerForm.classList.add('hidden');
                if (loginForm) loginForm.classList.remove('hidden');
            } catch (error) {
                alert("Error en el registro: " + error.message);
            }
        });
    }
});