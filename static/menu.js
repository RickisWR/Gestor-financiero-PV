document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 768;

    const saveMenuState = (isCollapsed) => localStorage.setItem('menuCollapsed', isCollapsed);
    const loadMenuState = () => localStorage.getItem('menuCollapsed') === 'true';

    // LÓGICA DE BARRA LATERAL
    if (sidebar) {
        if (isMobile) {
            sidebar.classList.add('collapsed');
        } else if (loadMenuState()) {
            sidebar.classList.add('collapsed');
        }
    }

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            if (!isMobile) saveMenuState(sidebar.classList.contains('collapsed'));
        });
    }

    if (isMobile && sidebar) {
        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => sidebar.classList.add('collapsed'));
        });
    }

    // LÓGICA DE MENÚ DESPLEGABLE DE USUARIO (LOGO)
    const userMenuBtn = document.querySelector('.user-profile, .user-avatar, #btn-user-menu');
    const dropdown = document.getElementById("user-dropdown");

    if (userMenuBtn && dropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que el clic se propague al documento
            dropdown.classList.toggle("mostrar");
        });
    }

    // Cerrar menú si se hace click fuera
    window.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu-container') && !e.target.closest('.user-profile')) {
            if (dropdown && dropdown.classList.contains('mostrar')) {
                dropdown.classList.remove('mostrar');
            }
        }
    });
});