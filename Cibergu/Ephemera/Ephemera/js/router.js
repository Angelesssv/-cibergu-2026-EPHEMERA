export const initRouter = () => {
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === path) {
            item.classList.add('active');
        }
    });
};