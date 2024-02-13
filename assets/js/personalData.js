// myaccount.js
import { firestore, auth } from './firebase-config.js';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Get a reference to the Firebase storage service
const storage = getStorage();

// Function to get and display user profile data
async function getAndDisplayAllProfileData() {
    if (auth.currentUser) {
        try {
            // Definim calea către colecția de înregistrări
            const recordsRef = collection(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records`);
            // Creăm o interogare care să ordoneze înregistrările după dată, în ordine crescătoare sau descrescătoare, după preferință
            const q = query(recordsRef, orderBy("date", "desc")); // sau "asc" pentru ordine crescătoare

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Aici, va trebui să decizi cum să afișezi datele. De exemplu, poți adăuga fiecare set de date la un element HTML.
                console.log(data); // Afișează datele în consolă pentru demonstrație
                // Implementează logica de afișare a datelor pe pagina ta, posibil prin adăugarea fiecărei înregistrări la un tabel sau la o listă
            });
        } catch (error) {
            console.error("Error fetching profile data:", error);
        }
    }
}

// Function to get and display user progress pictures
async function getAndDisplayProgressPictures() {
    if (auth.currentUser) {
        try {
            const q = query(collection(firestore, `users/${auth.currentUser.uid}/progressPictures`), orderBy("uploadDate"));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
                const imagesData = doc.data();
                // Display images on the myaccount page
                displayProgressPictures(imagesData);
            });
        } catch (error) {
            console.error("Error fetching progress pictures:", error);
        }
    }
}


function displayProgressPictures(imagesData) {
    // Presupunem că ai un container în HTML unde vrei să adaugi imaginile
    const imagesContainer = document.getElementById('progressPicturesContainer');

    // Creează un nou element pentru fiecare set de imagini
    const imageSetElement = document.createElement('div');
    imageSetElement.classList.add('image-set'); // Adaugă o clasă pentru styling, dacă este necesar

    // Adaugă fiecare imagine în elementul setului
    if (imagesData.frontImage) {
        const frontImg = document.createElement('img');
        frontImg.src = imagesData.frontImage;
        frontImg.alt = 'Front View';
        imageSetElement.appendChild(frontImg);
    }
    if (imagesData.sideImage) {
        const sideImg = document.createElement('img');
        sideImg.src = imagesData.sideImage;
        sideImg.alt = 'Side View';
        imageSetElement.appendChild(sideImg);
    }
    if (imagesData.backImage) {
        const backImg = document.createElement('img');
        backImg.src = imagesData.backImage;
        backImg.alt = 'Back View';
        imageSetElement.appendChild(backImg);
    }

    // Adaugă setul de imagini la containerul principal
    imagesContainer.appendChild(imageSetElement);
}

document.getElementById('deletePersonalDataButton').addEventListener('click', function() {
    const dateToDelete = document.getElementById('deletePersonalDataDate').value;
    if (dateToDelete) {
        deleteProfileDataByDate(dateToDelete).then(() => {
            alert('Datele personale pentru data selectată au fost șterse.');
        }).catch((error) => {
            console.error('Eroare la ștergerea datelor personale:', error);
        });
    } else {
        alert('Vă rugăm să selectați o dată.');
    }
});

document.getElementById('deleteProgressPicturesButton').addEventListener('click', function() {
    const dateToDelete = document.getElementById('deleteProgressPicturesDate').value;
    if (dateToDelete) {
        deleteProgressPicturesByDate(dateToDelete).then(() => {
            alert('Pozele de progres pentru data selectată au fost șterse.');
        }).catch((error) => {
            console.error('Eroare la ștergerea pozelor de progres:', error);
        });
    } else {
        alert('Vă rugăm să selectați o dată.');
    }
});

// // Add an event listener for the edit button
// document.getElementById('editButton').addEventListener('click', function() {
//     // Hide the display elements
//     document.getElementById('heightDisplay').style.display = 'none';
//     document.getElementById('weightDisplay').style.display = 'none';
//     document.getElementById('waistDisplay').style.display = 'none';
//     document.getElementById('bustDisplay').style.display = 'none';
//     document.getElementById('armsDisplay').style.display = 'none';
//     document.getElementById('thighsDisplay').style.display = 'none';

//     // Display the text fields
//     document.getElementById('height').style.display = 'block';
//     document.getElementById('weight').style.display = 'block';
//     document.getElementById('waist').style.display = 'block';
//     document.getElementById('bust').style.display = 'block';
//     document.getElementById('arms').style.display = 'block';
//     document.getElementById('thighs').style.display = 'block';

//     // Hide the edit button
//     this.style.display = 'none';
// });

async function deleteProfileDataByDate(dateToDelete) {
    if (auth.currentUser) {
        try {
            // Transformă data în formatul corespunzător pentru a o compara cu datele din Firestore
            const startOfDay = new Date(dateToDelete);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(dateToDelete);
            endOfDay.setHours(23, 59, 59, 999);

            // Referința către colecția de înregistrări
            const recordsRef = collection(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records`);
            
            // Creează o interogare pentru a găsi documentele dintr-o anumită zi
            const q = query(recordsRef, where("date", ">=", startOfDay), where("date", "<=", endOfDay));

            const querySnapshot = await getDocs(q);
            
            // Verifică dacă există documente în intervalul specificat și le șterge
            if (!querySnapshot.empty) {
                const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                console.log(`Profile data from ${dateToDelete} successfully deleted.`);
            } else {
                console.log(`No profile data found for ${dateToDelete}.`);
            }
        } catch (error) {
            console.error(`Error deleting profile data from ${dateToDelete}:`, error);
        }
    }
}

async function deleteProgressPicturesByDate(dateToDelete) {
    if (auth.currentUser) {
        try {
            // Convert the date to the start and end of the specified day
            const startOfDay = new Date(dateToDelete);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(dateToDelete);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Reference to the user's progressPictures collection
            const picturesRef = collection(firestore, `users/${auth.currentUser.uid}/progressPictures`);
            
            // Query to find pictures uploaded on the specified date
            const q = query(picturesRef, where("uploadDate", ">=", startOfDay), where("uploadDate", "<=", endOfDay));

            const querySnapshot = await getDocs(q);
            
            // Delete each document found for the specified date
            const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            console.log(`Progress pictures from ${dateToDelete} successfully deleted.`);
        } catch (error) {
            console.error(`Error deleting progress pictures from ${dateToDelete}:`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Add listener for the delete button
    document.getElementById('deletePersonalDataButton').addEventListener('click', deletePersonalDataDate);
    document.getElementById('deleteProgressPicturesButton').addEventListener('click', deleteProgressPicturesDate);

    // Add event listener for the image upload form and personal data form here
    const inputs = document.querySelectorAll('#personal-data-form input');
    const saveButton = document.getElementById('saveButton'); // Make sure you have a button with this ID
    const editButton = document.getElementById('editButton'); // Make sure you have a button with this ID

    if (!saveButton || !editButton) {
        console.error('Save or Edit button not found');
        return;
    }
    saveButton.style.display = 'none'; // Initially hide the button

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            let isAnyInputFilled = Array.from(inputs).some(input => input.value.trim() !== '');
            saveButton.style.display = isAnyInputFilled ? 'block' : 'none';
        });
    });

    document.getElementById('personal-data-form').addEventListener('submit', async function(event) {
        event.preventDefault();
    
        // The values fetched from the form
        const personalData = {
            date: new Date(), // Add the current date
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            waist: document.getElementById('waist').value,
            bust: document.getElementById('bust').value,
            arms: document.getElementById('arms').value,
            thighs: document.getElementById('thighs').value,
        };
    
        if (auth.currentUser) {
            try {
                // Save the personal data to the user's profile in Firestore
                await setDoc(doc(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records/${personalData.date.toISOString()}`), personalData);
    
                console.log('Personal data successfully saved.');
                document.getElementById('successMessage').style.display = 'block'; // Display the success message
            } catch (error) {
                console.error('Error saving personal data:', error);
            }
        } else {
            console.log('No user is signed in.');
        }
    });
    
   // Add an event listener for the image upload form
   document.getElementById('progress-pictures-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get the uploaded images
    const frontImage = document.getElementById('front-image').files[0];
    const sideImage = document.getElementById('side-image').files[0];
    const backImage = document.getElementById('back-image').files[0];

    // Create a reference to the storage location for each image
    const frontImageRef = ref(storage, `users/${auth.currentUser.uid}/progressPictures/frontImage`);
    const sideImageRef = ref(storage, `users/${auth.currentUser.uid}/progressPictures/sideImage`);
    const backImageRef = ref(storage, `users/${auth.currentUser.uid}/progressPictures/backImage`);

    // Upload the images and save the references to them in Firestore
    try {
        await uploadBytesResumable(frontImageRef, frontImage);
        await uploadBytesResumable(sideImageRef, sideImage);
        await uploadBytesResumable(backImageRef, backImage);

        const frontImageUrl = await getDownloadURL(frontImageRef);
        const sideImageUrl = await getDownloadURL(sideImageRef);
        const backImageUrl = await getDownloadURL(backImageRef);
        const userId = auth.currentUser.uid; // Obține UID-ul utilizatorului curent

        // Set the data for the progress pictures in Firestore
        const progressPicturesRef = collection(firestore, `users/${userId}/progressPictures`);
        const newProgressPicDoc = doc(progressPicturesRef);
        setDoc(newProgressPicDoc, {
            frontImage: frontImageUrl,
            sideImage: sideImageUrl,
            backImage: backImageUrl,
            uploadDate: serverTimestamp()
          }).then(() => {
            console.log("Progress pictures successfully uploaded.");
          }).catch((error) => {
            console.error("Error uploading progress pictures:", error);
          });
        

        console.log('Progress pictures successfully uploaded.');
    } catch (error) {
        console.error('Error uploading progress pictures:', error);
    }
});


    auth.onAuthStateChanged(user => {
        if (user) {
            getAndDisplayAllProfileData();
            getAndDisplayProgressPictures();
        }
    });
});
// End of myaccount.js