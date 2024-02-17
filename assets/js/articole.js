// Presupunând că ai importat și configurat Firebase într-un alt fișier
import { firestore } from './firebase-config.js';
import {doc, setDoc, deleteDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

   // Inițializarea Quill
let quill; // Variabilă globală pentru instanța Quill

document.addEventListener('DOMContentLoaded', function() {
    const articlesForm = document.getElementById('articles-form');
    const articlesList = document.getElementById('articlesList');

    // Inițializează Quill pentru conținutul articolului
    quill = new Quill('#articleContent', {
        theme: 'snow'
        
    });

    // Handler pentru submit-ul formularului de articole
    articlesForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('articleTitle').value;
        // Obține conținutul HTML generat de Quill
        const content = quill.root.innerHTML;
        const articleId = articlesForm.getAttribute('data-article-id');

        if (articleId) {
            // Actualizează un articol existent
            await setDoc(doc(firestore, "articole", articleId), {
                title,
                content,
                timestamp: serverTimestamp()
            }, { merge: true });
            console.log('Articolul a fost actualizat cu succes!');
        } else {
            // Adaugă un articol nou
            await addDoc(collection(firestore, "articole"), {
                title,
                content,
                timestamp: serverTimestamp()
            });
            console.log('Articolul a fost adăugat cu succes!');
        }

        articlesForm.reset(); // Resetează formularul
        quill.setContents([]); // Curăță Quill după submit
        articlesForm.removeAttribute('data-article-id'); // Curăță atributul pentru următoarea operațiune
        displayArticles(); // Reafisează lista de articole
    });

    const displayArticles = () => {
        const queryToArticles = query(collection(firestore, "articole"), orderBy("timestamp", "desc"));
    
        onSnapshot(queryToArticles, (querySnapshot) => {
            articlesList.innerHTML = ''; // Golește lista înainte de a re-afișa articolele
            articlesList.style.display = 'flex';
            articlesList.style.flexWrap = 'wrap';
            articlesList.style.justifyContent = 'space-between'; // Asigură-te că folosești spațiu între articole
            
            querySnapshot.forEach((doc) => {
                const article = doc.data();
                const articleElement = document.createElement('div');
                // Aplică stiluri pentru articol
                articleElement.style.width = 'calc(50% - 10px)'; // Calculează lățimea pentru două articole pe rând minus spațiu între ele
                articleElement.style.marginBottom = '20px'; // Spațiu între rânduri de articole
    
                const contentPreview = article.content.substring(0, 200) + '...';
                articleElement.classList.add('article');
                articleElement.innerHTML = `
                    <h4>${article.title}</h4>
                    <p>${contentPreview}</p>
                    <button class="edit" onclick="editArticle('${doc.id}')">Edit</button>
                    <button class="delete" onclick="deleteArticle('${doc.id}')">Delete</button>
                `;
    
                // Aplică stiluri pentru butoane direct prin JavaScript
                const buttons = articleElement.querySelectorAll('button');
                buttons.forEach(button => {
                    button.style.padding = '10px';
                    button.style.marginRight = '5px';
                    button.style.border = 'none';
                    button.style.borderRadius = '5px';
                    button.style.cursor = 'pointer';
                });
    
                // Diferențiază butoanele Edit și Delete prin culoare
                const editButton = articleElement.querySelector('.edit');
                const deleteButton = articleElement.querySelector('.delete');
                if (editButton) editButton.style.backgroundColor = '#4CAF50'; // Verde
                if (deleteButton) deleteButton.style.backgroundColor = '#f44336'; // Roșu
    
                articlesList.appendChild(articleElement);
            });
        });
    };
    
    
    // Apelarea funcției pentru a afișa articolele existente
    displayArticles();
});    

// Funcție pentru ștergerea unui articol
window.deleteArticle = async (articleId) => {
    await deleteDoc(doc(firestore, "articole", articleId));
    console.log('Articolul a fost șters cu succes!');
    displayArticles(); // Reafisează lista de articole după ștergere
};

// Funcție pentru editarea unui articol
window.editArticle = async (articleId) => {
    const articleRef = doc(firestore, "articole", articleId);
    const docSnap = await getDoc(articleRef);

    if (docSnap.exists()) {
        const articleData = docSnap.data();
        document.getElementById('articleTitle').value = articleData.title;
        // Încarcă conținutul în Quill
        quill.root.innerHTML = articleData.content;
        document.getElementById('articles-form').setAttribute('data-article-id', articleId); // Marchează formularul ca fiind în modul de editare
    } else {
        console.log("No such document!");
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const articlesList = document.getElementById('articles-container'); 

    const queryToArticles = query(collection(firestore, "articole"), orderBy("timestamp", "desc"));
    onSnapshot(queryToArticles, (querySnapshot) => {
        articlesList.innerHTML = ''; // Golește containerul înainte de a adăuga noi articole

        querySnapshot.forEach((doc) => {
            const article = doc.data();
            const articleElement = document.createElement('div');
            articleElement.classList.add('feature-item'); // Clasa pentru stilizarea cardului

            // Structura HTML actualizată pentru a se potrivi cu stilul dorit
            articleElement.innerHTML = `
                <div class="left-icon">
                    <img src="assets/images/features-first-icon.png" alt="Icon">
                </div>
                <div class="right-content">
                    <h4>${article.title}</h4>
                    <p>${article.content.substring(0, 100)}...</p>
                    <a href="article.html?id=${doc.id}" class="text-button">Discover More</a>
                </div>
            `;

            articlesList.appendChild(articleElement);
        });
    });
});

function updateMetaTags(articleData) {
    if (articleData) {
        // Actualizează titlul
        const titleTag = document.querySelector('meta[property="og:title"]');
        if (titleTag) {
            titleTag.setAttribute("content", articleData.title || "Titlu implicit");
        }

        // Preia primele 200 de caractere din conținutul articolului pentru descriere
        const descriptionContent = articleData.content.substring(0, 200) + "..." ;
        const descriptionTag = document.querySelector('meta[property="og:description"]');
        if (descriptionTag) {
            descriptionTag.setAttribute("content", descriptionContent);
        }

        // Actualizează imaginea
        const imageTag = document.querySelector('meta[property="og:image"]');
        if (imageTag && articleData.imageUrl) {
            imageTag.setAttribute("content", articleData.imageUrl);
        }
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const articleId = new URLSearchParams(window.location.search).get('id');
    if (articleId) {
        const articleRef = doc(firestore, "articole", articleId);
        const docSnap = await getDoc(articleRef);

        if (docSnap.exists()) {
            const articleData = docSnap.data();
            // Actualizează conținutul paginii cu datele articolului
            document.getElementById('articleTitle').textContent = articleData.title;
            document.getElementById('articleDate').textContent = articleData.timestamp ? articleData.timestamp.toDate().toLocaleDateString("ro-RO") : "Data necunoscută";
            document.getElementById('articleContentDisplay').innerHTML = articleData.content;
            
            // Actualizează metatagurile OG
            updateMetaTags({
                title: articleData.title,
                description: articleData.content ? articleData.content.substring(0, 200) + "..." : "",
            });
        } else {
            console.log("Articolul nu există!");
            // Afișează un mesaj corespunzător sau redirecționează utilizatorul
        }
    }
});


