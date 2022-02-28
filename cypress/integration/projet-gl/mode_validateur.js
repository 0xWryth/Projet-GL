describe('Passer en mode validateur - Chef de service', () => {

  // Conservation des cookies pour éviter de se reconnecter à chaque test
  beforeEach(() => {
    Cypress.Cookies.preserveOnce('next-auth.session-token', 'next-auth.callback-url', 'next-auth.csrf-token');
  })

  it('Connexion avec un compte de chef de service', () => {
    // Suppression des cookies si on était précédemment connecté, pour être redirigé à la page d'accueil pour un utilisateur non connecté
    cy.clearCookie('next-auth.session-token');
    cy.clearCookie('next-auth.callback-url');
    cy.clearCookie('next-auth.csrf-token');
    // Visite de l'url du site
    cy.visit('http://localhost:3000')
    // Accès à la page de connexion
    cy.contains('Se connecter').click()
    cy.wait(5000)

    // Insertion des valeurs des champs de connexion pour se connecter
    cy.get('input[name=email]').type('antonin.depreissat@pops2122.fr')
    cy.get('input[name=password]').type('Antonin')
    cy.contains('Se connecter').click()
    cy.wait(5000)
    // Vérification que la connexion a réussie
    cy.url().should('eq', 'http://localhost:3000/home/2022')
  })


  it('Passage en mode validateur', () => {
    cy.get('button').eq(0).click()
    cy.contains('Passer en mode validateur').click()
    cy.wait(8000)
    // Vérification de l'url
    cy.url().should('eq', 'http://localhost:3000/validateur/2022')
    cy.contains('Notes de vos collaborateurs (2022)')
  })


  it('Deconnexion', () => {
    // Deconnexion
    cy.get('button').eq(0).click()
    cy.contains('button', 'Deconnexion').click()
    // Vérification de l'url
    cy.url().should('eq', 'http://localhost:3000/')
  })


  it('Connexion avec un compte qui n\'est pas chef de service', () => {
    // Suppression des cookies si on était précédemment connecté, pour être redirigé à la page d'accueil pour un utilisateur non connecté
    cy.clearCookie('next-auth.session-token');
    cy.clearCookie('next-auth.callback-url');
    cy.clearCookie('next-auth.csrf-token');
    // Visite de l'url du site
    cy.visit('http://localhost:3000')
    // Accès à la page de connexion
    cy.contains('Se connecter').click()
    cy.wait(5000)

    // Insertion des valeurs des champs de connexion pour se connecter
    cy.get('input[name=email]').type('remy.thieffry@pops2122.fr')
    cy.get('input[name=password]').type('Rémy')
    cy.contains('Se connecter').click()
    cy.wait(5000)
    // Vérification que la connexion a réussie
    cy.url().should('eq', 'http://localhost:3000/home/2022')
  })


  it('Impossibilité de passage en mode validateur', () => {
    cy.get('button').eq(0).click()
    
    // Provoque une erreur puisque le bouton n'est pas présent
    // cy.contains('Passer en mode validateur').click()

    // Assure que le bouton concerné n'existe pas
    cy.contains('Passer en mode validateur').should('not.exist')
  })

})
