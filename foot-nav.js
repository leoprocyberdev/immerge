const eachSection = document.querySelectorAll('#navigate');

class Navigate {
  constructor(url) {
    this.url = url;
  }
  go() {
    window.location.href = this.url;
  }
}

const home = new Navigate('/');
const cartegories = new Navigate('/cartegories.html');
const cart = new Navigate('/cart.html');
const wishlist = new Navigate('/wishlist.html');
const account = new Navigate('/account.html');

eachSection.forEach((section) => {
  section.addEventListener('click', () => {
    const value = section.innerText[section.innerText.length - 2];
    //note m = home, e = cartegories, r = cart, s = wishlist and n = account
    switch (value) {
      case 'm':
        home.go();
        break;
      case 'e':
        cartegories.go()
        break;
      case 'r':
        cart.go();
        break;
      case 's':
        wishlist.go();
        break;
      case 'n':
        account.go();
        break;
      default:
        console.log('error');
    }
    
    console.log(section.innerText[section.innerText.length - 2]);
  });
});

