const menuButton = document.querySelector('.menu-button');
      const menuElement = document.querySelector('.menu');
      menuButton.addEventListener('click', () => {
        menuElement.style.display = 'block';
      })
      const menuRemove = document.querySelector('.menu-x');
      menuRemove.addEventListener('click', () => {
        menuElement.style.display = 'none';
      })
      
      const searchBringer = document.querySelector('.search-displayer');
      const searchElement = document.querySelector('.search');
      searchBringer.addEventListener('click', () => {
        searchElement.style.display = 'grid';
      });
      const searchRemover = document.querySelector('.search-x');
      searchRemover.addEventListener('click', () => {
        searchElement.style.display = 'none';
      });
      //Cartegory navigation
      const cartegoryButton = document.querySelector('.category');
      const cartegoryElement = document.querySelector('.cartegory-elm');
      const cartegoryElmRemove = document.querySelector('.catg-elm-x');
      cartegoryButton.addEventListener('click', () => {
        cartegoryElement.style.display = 'block';
      });
      cartegoryElmRemove.addEventListener('click', () => {
        cartegoryElement.style.display = 'none';
      });
      
      //filter navigation
      const filterButton = document.querySelector('.filter');
      const filterElement = document.querySelector('.filter-elm');
      const filterElmRemove = document.querySelector('.flt-elm-x');
      filterButton.addEventListener('click', () => {
        filterElement.style.display = 'block';
      });
      filterElmRemove.addEventListener('click', () => {
        filterElement.style.display = 'none';
      });