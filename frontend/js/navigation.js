document.querySelectorAll('.bottom-nav a').forEach((link) => {
  link.addEventListener('click', (event) => {
    const destination = link.href

    event.preventDefault()

    document.body.classList.add('page-leave')

    setTimeout(() => {
      window.location.href = destination
    }, 200)
  })
})

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'

  const navLinks = document.querySelectorAll('.bottom-nav a')

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute('href')

    if (linkPage === currentPage) {
      link.classList.add('active')
    } else {
      link.classList.remove('active')
    }
  })
})
