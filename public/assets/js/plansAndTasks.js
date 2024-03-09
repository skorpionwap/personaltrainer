// task-urile și planurile de antrenament și nutriție pentru fiecare client
import { firestore, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


let quillTrainingPlan, quillNutritionPlan, quillTaskDescription;

document.addEventListener('DOMContentLoaded', () => {
    initializeQuillEditors();

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Utilizator autentificat.");
            displayClients(user.uid).then(() => {
            attachEventListeners(user.uid);
            loadClientContent(user.uid);
            });
        } else {
            console.log("Niciun utilizator autentificat.");
        }
    });
});

function initializeQuillEditors() {
    quillTrainingPlan = new Quill('#trainingPlanEditor', {
        theme: 'snow'
    });
    quillNutritionPlan = new Quill('#nutritionPlanEditor', {
        theme: 'snow'
    });
    quillTaskDescription = new Quill('#taskEditor', {
        theme: 'snow'
    });
}

async function displayClients(trainerId) {
    const clientsList = document.getElementById('clientsLists');
    clientsList.innerHTML = ''; 
    
    const defaultOption = document.createElement('option');
    defaultOption.textContent = "Selectați un client";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    clientsList.appendChild(defaultOption);
    const q = query(collection(firestore, "subscriptions"), where("trainerId", "==", trainerId), where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log("Nu s-au găsit abonamente active pentru acest antrenor.");
        return;
    }

    querySnapshot.docs.forEach(async (subscriptionDoc) => {
        const clientId = subscriptionDoc.id;
        const clientRef = doc(firestore, "users", clientId);
        const clientDoc = await getDoc(clientRef);

        if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            const option = document.createElement('option');
            option.value = clientId;
            option.textContent = `${clientData.firstName} ${clientData.lastName}`;
            clientsList.appendChild(option);
        } else {
            console.log(`Nu există un document pentru clientul cu ID-ul ${clientId}`);
        }
    });
}


function attachEventListeners(uid) {
    const clientsListElement = document.getElementById('clientsLists');
    if (clientsListElement) {
        clientsListElement.addEventListener('change', async (e) => {
            console.log("Event de schimbare declanșat.");  // Verifică dacă acest log apare
            const clientId = e.target.value;
            console.log(`Client selectat: ${clientId}`);  // Verifică dacă ID-ul clientului apare
            if (clientId) {
                await loadClientData(clientId);
            } else {
                console.log("Niciun clientId selectat.");
            }
        });

        document.getElementById('saveTrainingPlanButton').addEventListener('click', () => saveTrainingPlan(uid));
        document.getElementById('saveNutritionPlanButton').addEventListener('click', () => saveNutritionPlan(uid));
        document.getElementById('saveTaskButton').addEventListener('click', () => addTask(uid));
        document.getElementById('editTrainingPlanButton').addEventListener('click', () => {
            editPlan('training');
        });

        document.getElementById('deleteTrainingPlanButton').addEventListener('click', () => {
            deletePlan(selectedClientId, 'training');
        });

        document.getElementById('editNutritionPlanButton').addEventListener('click', () => {
            editPlan('nutrition');
        });

        document.getElementById('deleteNutritionPlanButton').addEventListener('click', () => {
            deletePlan(selectedClientId, 'nutrition');
        });
        document.getElementById('editTaskButton').addEventListener('click', () => {
            editPlan('task');
        });
        
        document.getElementById('deleteTaskButton').addEventListener('click', () => {
            deleteTask(selectedClientId, currentTaskId);
        });
    }
}


// Funcția pentru salvarea sau actualizarea planului de antrenament
async function saveTrainingPlan(trainerId) {
    const selectedClientId = document.getElementById('clientsLists').value;
    const planContent = quillTrainingPlan.root.innerHTML;
    const plansRef = collection(firestore, `users/${selectedClientId}/trainingPlans`);
    const plansSnapshot = await getDocs(plansRef);

    if (!plansSnapshot.empty) {
        // Actualizează documentul existent
        const planDoc = plansSnapshot.docs[0];
        await updateDoc(planDoc.ref, { content: planContent });
        alert("Planul de antrenament a fost actualizat cu succes.");
    } else {
        // Creează un document nou
        await addDoc(plansRef, { content: planContent, trainerId: trainerId });
        alert("Planul de antrenament a fost creat cu succes.");
    }

    quillTrainingPlan.root.innerHTML = '';
    document.getElementById('trainingPlanDisplay').innerHTML = planContent;
}

// Funcția pentru salvarea sau actualizarea planului de nutriție
async function saveNutritionPlan(trainerId) {
    const selectedClientId = document.getElementById('clientsLists').value;
    const planContent = quillNutritionPlan.root.innerHTML;
    const plansRef = collection(firestore, `users/${selectedClientId}/nutritionPlans`);
    const plansSnapshot = await getDocs(plansRef);

    if (!plansSnapshot.empty) {
        // Actualizează documentul existent
        const planDoc = plansSnapshot.docs[0];
        await updateDoc(planDoc.ref, { content: planContent });
        alert("Planul de nutriție a fost actualizat cu succes.");
    } else {
        // Creează un document nou
        await addDoc(plansRef, { content: planContent, trainerId: trainerId });
        alert("Planul de nutriție a fost creat cu succes.");
    }

    quillNutritionPlan.root.innerHTML = '';
    document.getElementById('nutritionPlanDisplay').innerHTML = planContent;
}

async function addTask(trainerId) {
    const selectedClientId = document.getElementById('clientsLists').value;
    const taskDescriptionHtml = quillTaskDescription.root.innerHTML;
    const tasksRef = doc(firestore, `users/${selectedClientId}/tasks/tasksData`);
    const taskDoc = await getDoc(tasksRef);

    // Extrage task-urile ca array de string-uri, fiecare <p> fiind considerat un task
    const taskDescriptions = taskDescriptionHtml.match(/<p>.*?<\/p>/g) || [];
    // Inițializează stările task-urilor ca false (nebifat)
    const tasksCompleted = taskDescriptions.map(() => false);

    if (taskDoc.exists()) {
        // Actualizează task-ul existent și stările acestora
        await updateDoc(tasksRef, {
            description: taskDescriptionHtml,
            tasksCompleted: tasksCompleted
        });
        alert("Task-ul a fost actualizat cu succes.");
    } else {
        // Creează un nou document de task-uri și inițializează stările task-urilor
        await setDoc(tasksRef, {
            description: taskDescriptionHtml,
            tasksCompleted: tasksCompleted
        });
        alert("Task-ul a fost creat cu succes.");
    }

    quillTaskDescription.root.innerHTML = '';
    document.getElementById('taskDisplay').innerHTML = taskDescriptionHtml;
}



function truncateText(text, maxLength) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
    } else {
        return text;
    }
}

async function loadClientData(clientId) {
    console.log(`Încărcarea datelor pentru clientul cu ID-ul: ${clientId}`);

    const trainingPlanDisplay = document.getElementById('trainingPlanDisplay');
    const nutritionPlanDisplay = document.getElementById('nutritionPlanDisplay');
    const taskDisplay = document.getElementById('taskDisplay');

    trainingPlanDisplay.innerHTML = '';
    nutritionPlanDisplay.innerHTML = '';
    taskDisplay.innerHTML = '';

    try {
        console.log(`Se încarcă planul de antrenament pentru clientul ${clientId}`);
        const trainingPlanData = await getClientPlan(clientId, 'trainingPlans');
        console.log('Datele planului de antrenament:', trainingPlanData);
        trainingPlanDisplay.innerHTML = trainingPlanData.content ? truncateText(trainingPlanData.content, 800) : '<p>Niciun plan de antrenament disponibil.</p>';

        console.log(`Se încarcă planul de nutriție pentru clientul ${clientId}`);
        const nutritionPlanData = await getClientPlan(clientId, 'nutritionPlans');
        console.log('Datele planului de nutriție:', nutritionPlanData);
        nutritionPlanDisplay.innerHTML = nutritionPlanData.content ? truncateText(nutritionPlanData.content, 800) : '<p>Niciun plan de nutriție disponibil.</p>';

        console.log(`Se încarcă task-urile pentru clientul ${clientId}`);
        const tasksData = await getClientTasks(clientId);
        console.log('Datele task-urilor:', tasksData);
        tasksData.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.innerHTML = truncateText(task.description, 800);
        taskDisplay.appendChild(taskElement);
        });
    } catch (error) {
        console.error("Eroare la încărcarea datelor clientului:", error);
    }
}

// Funcția de editare ajustată pentru a include și taskurile
async function editPlan(planType) {
    let quillEditor;
    let displayElement;
    let editorElement;
    let plansRef;  // Definirea plansRef în scopul funcției

    const selectedClientId = document.getElementById('clientsLists').value;

    if (planType === 'training') {
        quillEditor = quillTrainingPlan;
        displayElement = document.getElementById('trainingPlanDisplay');
        editorElement = document.getElementById('trainingPlanEditor');
        plansRef = collection(firestore, `users/${selectedClientId}/trainingPlans`);
    } else if (planType === 'nutrition') {
        quillEditor = quillNutritionPlan;
        displayElement = document.getElementById('nutritionPlanDisplay');
        editorElement = document.getElementById('nutritionPlanEditor');
        plansRef = collection(firestore, `users/${selectedClientId}/nutritionPlans`);
    } else if (planType === 'task') {
        quillEditor = quillTaskDescription;
        displayElement = document.getElementById('taskDisplay');
        editorElement = document.getElementById('taskEditor');
        plansRef = collection(firestore, `users/${selectedClientId}/tasks`);
    }

    // Preia documentul existent și actualizează editorul
    const plansSnapshot = await getDocs(plansRef);
    if (!plansSnapshot.empty) {
        const planDoc = plansSnapshot.docs[0];
        const planData = planDoc.data();
        quillEditor.root.innerHTML = planType === 'task' ? planData.description : planData.content;
    } else {
        console.log(`Nu există un ${planType} pentru a fi editat.`);
        quillEditor.root.innerHTML = '';
    }

    // Afișează editorul și ascunde vizualizarea
    if (displayElement && editorElement) {
        displayElement.style.display = 'none';
        editorElement.style.display = 'block';
    } else {
        console.error(`Elementele pentru ${planType} nu au fost găsite.`);
    }
}




async function getClientPlan(clientId, planType) {
    const plansRef = collection(firestore, `users/${clientId}/${planType}`);
    const plansSnapshot = await getDocs(plansRef);
    // Returnăm doar primul document pentru simplificare
    return plansSnapshot.docs[0]?.data() || {};
}

async function getClientTasks(clientId) {
    const tasksRef = collection(firestore, `users/${clientId}/tasks`);
    const tasksSnapshot = await getDocs(tasksRef);
    return tasksSnapshot.docs.map(doc => doc.data());
}

async function loadClientContent(clientId) {
    // Încărcarea și afișarea planului de antrenament
    const trainingPlanRef = collection(firestore, `users/${clientId}/trainingPlans`);
    const trainingPlanSnapshot = await getDocs(trainingPlanRef);
    if (!trainingPlanSnapshot.empty) {
        const trainingPlan = trainingPlanSnapshot.docs[0].data().content;
        document.getElementById('clientTrainingPlanDisplay').innerHTML = trainingPlan;
    } else {
        document.getElementById('clientTrainingPlanDisplay').innerHTML = 'Niciun plan de antrenament disponibil.';
    }

    // Încărcarea și afișarea planului de nutriție
    const nutritionPlanRef = collection(firestore, `users/${clientId}/nutritionPlans`);
    const nutritionPlanSnapshot = await getDocs(nutritionPlanRef);
    if (!nutritionPlanSnapshot.empty) {
        const nutritionPlan = nutritionPlanSnapshot.docs[0].data().content;
        document.getElementById('clientNutritionPlanDisplay').innerHTML = nutritionPlan;
    } else {
        document.getElementById('clientNutritionPlanDisplay').innerHTML = 'Niciun plan de nutriție disponibil.';
    }
    
    // Încărcarea și afișarea task-urilor
const taskDocRef = doc(firestore, `users/${clientId}/tasks/tasksData`);
const taskDocSnapshot = await getDoc(taskDocRef);
const tasksContainer = document.getElementById('clientTasksDisplay');
tasksContainer.innerHTML = ''; // Clear the container before adding new tasks

if (taskDocSnapshot.exists()) {
    const tasksHtml = taskDocSnapshot.data().description;
    const tasksCompleted = taskDocSnapshot.data().tasksCompleted || [];
    const parser = new DOMParser();
    const parsedHtml = parser.parseFromString(tasksHtml, 'text/html');
    const paragraphs = parsedHtml.body.querySelectorAll('p');

    paragraphs.forEach((p, index) => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `task-${index}`;
        checkbox.checked = tasksCompleted[index]; // Setează starea checkbox-ului conform cu array-ul tasksCompleted
        checkbox.classList.add('task-checkbox');

        // Listener pentru schimbarea stării task-ului
        checkbox.addEventListener('change', async (e) => {
            tasksCompleted[index] = e.target.checked; // Actualizează starea task-ului în array-ul local
            await updateDoc(taskDocRef, { tasksCompleted }); // Actualizează Firestore
        });

        const label = document.createElement('label');
        label.htmlFor = `task-${index}`;
        label.innerHTML = p.innerHTML;

        taskElement.appendChild(checkbox);
        taskElement.appendChild(label);

        tasksContainer.appendChild(taskElement);
    });
} else {
    tasksContainer.innerHTML = '<p>Niciun task disponibil.</p>';
}
}