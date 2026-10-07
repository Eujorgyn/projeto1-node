const STORAGE_KEY = "todolist.tasks.v2";
const OLD_STORAGE_KEY = "todolist.tasks.v1";

const MAX_TASKS = 10;
const MAX_CHARACTERS = 70;

const taskInput =
    document.getElementById("task-input");

const addTaskButton =
    document.getElementById("add-task-btn");

const taskList =
    document.getElementById("task-list");

const taskCounter =
    document.getElementById("task-counter");

const characterCounter =
    document.getElementById("character-counter");

const statTotal =
    document.getElementById("stat-total");

const statPending =
    document.getElementById("stat-pending");

const statDone =
    document.getElementById("stat-done");

const statTotalLabel =
    document.getElementById("stat-total-label");

const statPendingLabel =
    document.getElementById("stat-pending-label");

const statDoneLabel =
    document.getElementById("stat-done-label");

const emptyState =
    document.getElementById("empty-state");

const toastContainer =
    document.getElementById("toast-container");

const deleteModal =
    document.getElementById("delete-modal");

const deleteModalTitle =
    document.getElementById("delete-modal-title");

const deleteModalDescription =
    document.getElementById("delete-modal-description");

const cancelDeleteButton =
    document.getElementById("cancel-delete-btn");

const confirmDeleteButton =
    document.getElementById("confirm-delete-btn");

let tasks = [];

let taskPendingDeletion = null;

let deletionMode = null;

let draggedTaskId = null;


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadTasks() {

    try {

        let saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {

            saved =
                localStorage.getItem(
                    OLD_STORAGE_KEY
                );

        }

        if (!saved) {

            return [];

        }

        const parsed =
            JSON.parse(saved);

        if (!Array.isArray(parsed)) {

            return [];

        }

        return parsed
            .filter(
                task =>
                    task &&
                    typeof task.id === "string" &&
                    typeof task.text === "string"
            )
            .slice(
                0,
                MAX_TASKS
            )
            .map(
                (task, index) => ({

                    id:
                        task.id,

                    text:
                        normalizeTaskText(
                            task.text
                        ).slice(
                            0,
                            MAX_CHARACTERS
                        ),

                    completed:
                        Boolean(
                            task.completed
                        ),

                    completedAt:
                        typeof task.completedAt === "string"
                            ? task.completedAt
                            : null,

                    order:
                        Number.isFinite(
                            Number(task.order)
                        )
                            ? Number(task.order)
                            : index

                })
            );

    } catch (error) {

        console.error(
            "Erro ao carregar tarefas:",
            error
        );

        return [];

    }

}


function saveTasks() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

    } catch (error) {

        console.error(
            "Erro ao salvar tarefas:",
            error
        );

    }

}


/* =========================================================
   ID
   ========================================================= */

function createId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return (
        "task-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(16)
            .slice(2)
    );

}


/* =========================================================
   NORMALIZAR TEXTO
   ========================================================= */

function normalizeTaskText(value) {

    const normalized =
        String(value)
            .trim()
            .replace(
                /\s+/g,
                " "
            );

    if (!normalized) {

        return "";

    }

    return (
        normalized
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR"
            ) +
        normalized.slice(1)
    );

}


/* =========================================================
   HORÁRIO
   ========================================================= */

function getCurrentTime() {

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(
        new Date()
    );

}


/* =========================================================
   ORDEM
   ========================================================= */

function normalizeOrders() {

    const pending =
        tasks
            .filter(
                task =>
                    !task.completed
            )
            .sort(
                (a, b) =>
                    a.order -
                    b.order
            );

    const completed =
        tasks
            .filter(
                task =>
                    task.completed
            )
            .sort(
                (a, b) =>
                    a.order -
                    b.order
            );

    pending.forEach(
        (task, index) => {

            task.order =
                index;

        }
    );

    completed.forEach(
        (task, index) => {

            task.order =
                index;

        }
    );

}


function getPendingTasks() {

    return tasks
        .filter(
            task =>
                !task.completed
        )
        .sort(
            (a, b) =>
                a.order -
                b.order
        );

}


function getCompletedTasks() {

    return tasks
        .filter(
            task =>
                task.completed
        )
        .sort(
            (a, b) =>
                a.order -
                b.order
        );

}


/* =========================================================
   CONTADOR DE CARACTERES
   ========================================================= */

function updateCharacterCounter() {

    const length =
        taskInput.value.length;

    characterCounter.textContent =
        `${length}/${MAX_CHARACTERS}`;

    characterCounter.classList.toggle(
        "is-near-limit",
        length >= 55 &&
        length < MAX_CHARACTERS
    );

    characterCounter.classList.toggle(
        "is-full",
        length >= MAX_CHARACTERS
    );

}


/* =========================================================
   ADICIONAR TAREFA
   ========================================================= */

function addTask() {

    if (
        tasks.length >= MAX_TASKS
    ) {

        showToast(
            "Você atingiu o limite de 10 tarefas.",
            "limit"
        );

        return;

    }

    const text =
        normalizeTaskText(
            taskInput.value
        );

    if (!text) {

        showToast(
            "Digite uma tarefa antes de adicionar.",
            "error"
        );

        taskInput.focus();

        return;

    }

    if (
        text.length >
        MAX_CHARACTERS
    ) {

        showToast(
            `Máximo de ${MAX_CHARACTERS} caracteres.`,
            "error"
        );

        return;

    }

    tasks.push({

        id:
            createId(),

        text:
            text,

        completed:
            false,

        completedAt:
            null,

        order:
            getPendingTasks().length

    });

    normalizeOrders();

    saveTasks();

    taskInput.value =
        "";

    updateCharacterCounter();

    renderTasks();

    showToast(
        "Tarefa criada com sucesso!",
        "success"
    );

    taskInput.focus();

}


/* =========================================================
   CONCLUIR / DESCONCLUIR
   ========================================================= */

function toggleTask(taskId) {

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );

    if (!task) {

        return;

    }

    if (!task.completed) {

        task.completed =
            true;

        task.completedAt =
            getCurrentTime();

        task.order =
            getCompletedTasks().length;

    } else {

        task.completed =
            false;

        task.completedAt =
            null;

        task.order =
            getPendingTasks().length;

    }

    normalizeOrders();

    saveTasks();

    renderTasks(
        false
    );

}


/* =========================================================
   EDIÇÃO
   ========================================================= */

function startEditing(taskId) {

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );

    const card =
        document.querySelector(
            `[data-task-id="${taskId}"]`
        );

    if (
        !task ||
        !card
    ) {

        return;

    }

    const content =
        card.querySelector(
            ".task-content"
        );

    const actions =
        card.querySelector(
            ".task-actions"
        );

    if (!content) {

        return;

    }

    if (actions) {

        actions.hidden =
            true;

    }

    const editRow =
        document.createElement(
            "div"
        );

    editRow.className =
        "edit-row";

    const fieldWrapper =
        document.createElement(
            "div"
        );

    fieldWrapper.className =
        "edit-field-wrapper";

    const input =
        document.createElement(
            "input"
        );

    input.className =
        "edit-input";

    input.type =
        "text";

    input.maxLength =
        MAX_CHARACTERS;

    input.value =
        task.text;

    const counter =
        document.createElement(
            "span"
        );

    counter.className =
        "edit-character-counter";

    counter.textContent =
        `${input.value.length}/${MAX_CHARACTERS}`;

    fieldWrapper.append(
        input,
        counter
    );

    const buttonArea =
        document.createElement(
            "div"
        );

    buttonArea.className =
        "edit-inline-actions";

    const saveButton =
        document.createElement(
            "button"
        );

    saveButton.type =
        "button";

    saveButton.className =
        "edit-inline-button save";

    saveButton.textContent =
        "✓";

    saveButton.setAttribute(
        "aria-label",
        "Salvar edição"
    );

    const cancelButton =
        document.createElement(
            "button"
        );

    cancelButton.type =
        "button";

    cancelButton.className =
        "edit-inline-button";

    cancelButton.textContent =
        "×";

    cancelButton.setAttribute(
        "aria-label",
        "Cancelar edição"
    );

    buttonArea.append(
        saveButton,
        cancelButton
    );

    editRow.append(
        fieldWrapper,
        buttonArea
    );

    content.innerHTML =
        "";

    content.appendChild(
        editRow
    );

    input.addEventListener(
        "input",
        () => {

            counter.textContent =
                `${input.value.length}/${MAX_CHARACTERS}`;

        }
    );

    saveButton.addEventListener(
        "click",
        () => {

            saveEditedTask(
                taskId,
                input.value
            );

        }
    );

    cancelButton.addEventListener(
        "click",
        () => {

            renderTasks(
                false
            );

        }
    );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                saveEditedTask(
                    taskId,
                    input.value
                );

            }

            if (
                event.key === "Escape"
            ) {

                event.preventDefault();

                renderTasks(
                    false
                );

            }

        }
    );

    input.focus();

    input.select();

}


function saveEditedTask(
    taskId,
    value
) {

    const text =
        normalizeTaskText(
            value
        );

    if (!text) {

        showToast(
            "A tarefa não pode ficar vazia.",
            "error"
        );

        return;

    }

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );

    if (!task) {

        return;

    }

    task.text =
        text.slice(
            0,
            MAX_CHARACTERS
        );

    saveTasks();

    renderTasks(
        false
    );

    showToast(
        "Tarefa atualizada com sucesso!",
        "edit"
    );

}


/* =========================================================
   ABRIR MODAL
   ========================================================= */

function openDeleteModal() {

    deleteModal.classList.add(
        "is-visible"
    );

    deleteModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    setTimeout(
        () => {

            cancelDeleteButton.focus();

        },
        50
    );

}


/* =========================================================
   EXCLUSÃO INDIVIDUAL
   ========================================================= */

function requestDeleteTask(taskId) {

    taskPendingDeletion =
        taskId;

    deletionMode =
        "single";

    deleteModalTitle.textContent =
        "Excluir tarefa?";

    deleteModalDescription.textContent =
        "Você poderá desfazer a exclusão por alguns segundos.";

    confirmDeleteButton.textContent =
        "Excluir";

    openDeleteModal();

}


/* =========================================================
   CONFIRMAÇÃO PARA APAGAR CONCLUÍDAS
   ========================================================= */

function requestClearCompletedTasks() {

    const completedTasks =
        getCompletedTasks();

    if (
        completedTasks.length === 0
    ) {

        return;

    }

    deletionMode =
        "completed";

    taskPendingDeletion =
        null;

    if (
        completedTasks.length === 1
    ) {

        deleteModalTitle.textContent =
            "Apagar tarefa concluída?";

        deleteModalDescription.textContent =
            "A tarefa concluída será removida. Você poderá desfazer por alguns segundos.";

    } else {

        deleteModalTitle.textContent =
            "Apagar tarefas concluídas?";

        deleteModalDescription.textContent =
            `As ${completedTasks.length} tarefas concluídas serão removidas. Você poderá desfazer por alguns segundos.`;

    }

    confirmDeleteButton.textContent =
        "Apagar";

    openDeleteModal();

}


/* =========================================================
   FECHAR MODAL
   ========================================================= */

function closeDeleteModal() {

    taskPendingDeletion =
        null;

    deletionMode =
        null;

    deleteModal.classList.remove(
        "is-visible"
    );

    deleteModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

}


/* =========================================================
   CONFIRMAR MODAL
   ========================================================= */

function confirmDeleteAction() {

    if (
        deletionMode ===
        "completed"
    ) {

        closeDeleteModal();

        clearCompletedTasks();

        return;

    }

    if (
        deletionMode !==
        "single" ||
        !taskPendingDeletion
    ) {

        closeDeleteModal();

        return;

    }

    const taskId =
        taskPendingDeletion;

    closeDeleteModal();

    const card =
        document.querySelector(
            `[data-task-id="${taskId}"]`
        );

    if (card) {

        card.classList.add(
            "is-removing"
        );

        setTimeout(
            () => {

                removeTask(
                    taskId
                );

            },
            200
        );

    } else {

        removeTask(
            taskId
        );

    }

}


/* =========================================================
   REMOVER UMA TAREFA
   ========================================================= */

function removeTask(taskId) {

    const deletedTask =
        tasks.find(
            task =>
                task.id === taskId
        );

    if (!deletedTask) {

        return;

    }

    const snapshot = {

        ...deletedTask

    };

    tasks =
        tasks.filter(
            task =>
                task.id !== taskId
        );

    normalizeOrders();

    saveTasks();

    renderTasks(
        false
    );

    showUndoDeleteToast(
        snapshot
    );

}


/* =========================================================
   RESTAURAR UMA TAREFA
   ========================================================= */

function restoreDeletedTask(
    deletedTask
) {

    if (!deletedTask) {

        return false;

    }

    if (
        tasks.some(
            task =>
                task.id ===
                deletedTask.id
        )
    ) {

        return false;

    }

    if (
        tasks.length >= MAX_TASKS
    ) {

        showToast(
            "Não foi possível desfazer: limite de 10 tarefas.",
            "limit"
        );

        return false;

    }

    tasks.forEach(
        task => {

            if (
                task.completed ===
                    deletedTask.completed &&
                task.order >=
                    deletedTask.order
            ) {

                task.order +=
                    1;

            }

        }
    );

    tasks.push({

        ...deletedTask

    });

    normalizeOrders();

    saveTasks();

    renderTasks(
        false
    );

    showToast(
        "Tarefa restaurada.",
        "success"
    );

    return true;

}


/* =========================================================
   APAGAR TODAS AS CONCLUÍDAS
   ========================================================= */

function clearCompletedTasks() {

    const completedTasks =
        getCompletedTasks();

    if (
        completedTasks.length === 0
    ) {

        return;

    }

    const snapshots =
        completedTasks.map(
            task => ({

                ...task

            })
        );

    const ids =
        new Set(
            snapshots.map(
                task =>
                    task.id
            )
        );

    tasks =
        tasks.filter(
            task =>
                !ids.has(
                    task.id
                )
        );

    normalizeOrders();

    saveTasks();

    renderTasks(
        false
    );

    showUndoClearCompletedToast(
        snapshots
    );

}


/* =========================================================
   RESTAURAR TODAS AS CONCLUÍDAS
   ========================================================= */

function restoreClearedCompletedTasks(
    deletedTasks
) {

    if (
        !Array.isArray(
            deletedTasks
        ) ||
        deletedTasks.length === 0
    ) {

        return false;

    }

    const tasksToRestore =
        deletedTasks.filter(
            deletedTask =>
                !tasks.some(
                    task =>
                        task.id ===
                        deletedTask.id
                )
        );

    if (
        tasks.length +
        tasksToRestore.length >
        MAX_TASKS
    ) {

        showToast(
            "Não foi possível desfazer: o limite é de 10 tarefas.",
            "limit"
        );

        return false;

    }

    tasks.push(
        ...tasksToRestore.map(
            task => ({

                ...task

            })
        )
    );

    normalizeOrders();

    saveTasks();

    renderTasks(
        false
    );

    showToast(
        tasksToRestore.length === 1
            ? "Tarefa concluída restaurada."
            : `${tasksToRestore.length} tarefas concluídas restauradas.`,
        "success"
    );

    return true;

}


/* =========================================================
   ESTATÍSTICAS
   ========================================================= */

function updateStats() {

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            task =>
                task.completed
        ).length;

    const pending =
        total -
        completed;

    statTotal.textContent =
        total;

    statPending.textContent =
        pending;

    statDone.textContent =
        completed;

    statTotalLabel.textContent =
        "Total";

    statPendingLabel.textContent =
        pending === 1
            ? "Pendente"
            : "Pendentes";

    statDoneLabel.textContent =
        completed === 1
            ? "Feita"
            : "Feitas";

}


/* =========================================================
   CONTADOR DE TAREFAS
   ========================================================= */

function updateTaskCounter() {

    const total =
        tasks.length;

    taskCounter.textContent =
        `${total}/${MAX_TASKS}`;

    const isFull =
        total >= MAX_TASKS;

    taskCounter.classList.toggle(
        "is-full",
        isFull
    );

    addTaskButton.disabled =
        isFull;

}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function updateEmptyState() {

    emptyState.hidden =
        tasks.length > 0;

}


/* =========================================================
   DIVISOR DAS CONCLUÍDAS
   ========================================================= */

function createCompletedDivider(
    amount
) {

    const divider =
        document.createElement(
            "div"
        );

    divider.className =
        "completed-divider";

    const label =
        document.createElement(
            "span"
        );

    label.className =
        "completed-divider-label";

    label.textContent =
        `Concluídas · ${amount}`;

    const clearButton =
        document.createElement(
            "button"
        );

    clearButton.type =
        "button";

    clearButton.className =
        "clear-completed-button";

    clearButton.textContent =
        "Apagar concluídas";

    clearButton.setAttribute(
        "aria-label",
        amount === 1
            ? "Apagar tarefa concluída"
            : `Apagar ${amount} tarefas concluídas`
    );

    clearButton.addEventListener(
        "click",
        requestClearCompletedTasks
    );

    divider.append(
        label,
        clearButton
    );

    return divider;

}


/* =========================================================
   BOTÃO DE ÍCONE
   ========================================================= */

function createIconButton(
    label,
    className,
    svg
) {

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        `icon-button ${className}`;

    button.setAttribute(
        "aria-label",
        label
    );

    button.innerHTML =
        svg;

    return button;

}


/* =========================================================
   ÍCONES
   ========================================================= */

const editIcon = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4Z"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
`;


const deleteIcon = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M4 7h16M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7M7 7l.7 12a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9L17 7M10 10.5v5.8M14 10.5v5.8"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
`;


/* =========================================================
   CRIAR CARD
   ========================================================= */

function createTaskCard(task) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "task-card";

    card.dataset.taskId =
        task.id;

    card.draggable =
        true;

    if (task.completed) {

        card.classList.add(
            "is-completed"
        );

    }


    /* DRAG */

    const dragHandle =
        document.createElement(
            "div"
        );

    dragHandle.className =
        "drag-handle";

    dragHandle.setAttribute(
        "aria-hidden",
        "true"
    );

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const dot =
            document.createElement(
                "span"
            );

        dot.className =
            "drag-dot";

        dragHandle.appendChild(
            dot
        );

    }


    /* CHECKBOX */

    const checkbox =
        document.createElement(
            "button"
        );

    checkbox.type =
        "button";

    checkbox.className =
        "checkbox-button";

    checkbox.setAttribute(
        "aria-label",
        task.completed
            ? "Marcar como pendente"
            : "Marcar como concluída"
    );

    if (task.completed) {

        checkbox.classList.add(
            "is-checked"
        );

    }

    const check =
        document.createElement(
            "span"
        );

    check.className =
        "checkbox-check";

    check.textContent =
        "✓";

    checkbox.appendChild(
        check
    );


    /* CONTEÚDO */

    const content =
        document.createElement(
            "div"
        );

    content.className =
        "task-content";

    const text =
        document.createElement(
            "span"
        );

    text.className =
        "task-text";

    text.textContent =
        task.text;

    content.appendChild(
        text
    );

    if (
        task.completed &&
        task.completedAt
    ) {

        const completionTime =
            document.createElement(
                "span"
            );

        completionTime.className =
            "task-completion-time";

        completionTime.textContent =
            `Concluída às ${task.completedAt}`;

        content.appendChild(
            completionTime
        );

    }


    /* AÇÕES */

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "task-actions";

    const editButton =
        createIconButton(
            "Editar tarefa",
            "edit-button",
            editIcon
        );

    const deleteButton =
        createIconButton(
            "Excluir tarefa",
            "delete-button",
            deleteIcon
        );

    actions.append(
        editButton,
        deleteButton
    );

    card.append(
        dragHandle,
        checkbox,
        content,
        actions
    );


    checkbox.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toggleTask(
                task.id
            );

        }
    );


    editButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            startEditing(
                task.id
            );

        }
    );


    deleteButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            requestDeleteTask(
                task.id
            );

        }
    );


    card.addEventListener(
        "dragstart",
        event => {

            if (
                event.target.closest(
                    "button, input"
                )
            ) {

                event.preventDefault();

                return;

            }

            draggedTaskId =
                task.id;

            card.classList.add(
                "dragging"
            );

            event.dataTransfer.effectAllowed =
                "move";

        }
    );


    card.addEventListener(
        "dragend",
        () => {

            card.classList.remove(
                "dragging"
            );

            finishDrag();

        }
    );


    return card;

}


/* =========================================================
   DRAG AND DROP
   ========================================================= */

taskList.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        if (!draggedTaskId) {

            return;

        }

        const draggedTask =
            tasks.find(
                task =>
                    task.id ===
                    draggedTaskId
            );

        if (!draggedTask) {

            return;

        }

        const cards = [
            ...taskList.querySelectorAll(
                ".task-card"
            )
        ].filter(
            card =>
                card.dataset.taskId !==
                draggedTaskId
        );

        const sameGroupCards =
            cards.filter(
                card => {

                    const currentTask =
                        tasks.find(
                            task =>
                                task.id ===
                                card.dataset.taskId
                        );

                    return (
                        currentTask &&
                        currentTask.completed ===
                            draggedTask.completed
                    );

                }
            );

        if (
            sameGroupCards.length === 0
        ) {

            return;

        }

        const afterElement =
            getDragAfterElement(
                sameGroupCards,
                event.clientY
            );

        const draggedCard =
            taskList.querySelector(
                `[data-task-id="${draggedTaskId}"]`
            );

        if (!draggedCard) {

            return;

        }

        if (afterElement) {

            taskList.insertBefore(
                draggedCard,
                afterElement
            );

        } else {

            const lastCard =
                sameGroupCards[
                    sameGroupCards.length -
                    1
                ];

            lastCard.insertAdjacentElement(
                "afterend",
                draggedCard
            );

        }

    }
);


function getDragAfterElement(
    cards,
    mouseY
) {

    let closest = {

        offset:
            Number.NEGATIVE_INFINITY,

        element:
            null

    };

    cards.forEach(
        card => {

            const box =
                card.getBoundingClientRect();

            const offset =
                mouseY -
                box.top -
                box.height / 2;

            if (
                offset < 0 &&
                offset >
                closest.offset
            ) {

                closest = {

                    offset:
                        offset,

                    element:
                        card

                };

            }

        }
    );

    return closest.element;

}


function finishDrag() {

    if (!draggedTaskId) {

        return;

    }

    const draggedTask =
        tasks.find(
            task =>
                task.id ===
                draggedTaskId
        );

    if (!draggedTask) {

        draggedTaskId =
            null;

        return;

    }

    const cards = [
        ...taskList.querySelectorAll(
            ".task-card"
        )
    ];

    const groupIds =
        cards
            .map(
                card =>
                    card.dataset.taskId
            )
            .filter(
                id => {

                    const task =
                        tasks.find(
                            item =>
                                item.id === id
                        );

                    return (
                        task &&
                        task.completed ===
                            draggedTask.completed
                    );

                }
            );

    groupIds.forEach(
        (id, index) => {

            const task =
                tasks.find(
                    item =>
                        item.id === id
                );

            if (task) {

                task.order =
                    index;

            }

        }
    );

    normalizeOrders();

    saveTasks();

    draggedTaskId =
        null;

    renderTasks(
        false
    );

}


/* =========================================================
   RENDER
   ========================================================= */

function renderTasks(
    animateEntry = true
) {

    const pending =
        getPendingTasks();

    const completed =
        getCompletedTasks();

    taskList.innerHTML =
        "";

    pending.forEach(
        task => {

            const card =
                createTaskCard(
                    task
                );

            if (!animateEntry) {

                card.style.animation =
                    "none";

            }

            taskList.appendChild(
                card
            );

        }
    );

    if (
        completed.length > 0
    ) {

        taskList.appendChild(
            createCompletedDivider(
                completed.length
            )
        );

    }

    completed.forEach(
        task => {

            const card =
                createTaskCard(
                    task
                );

            if (!animateEntry) {

                card.style.animation =
                    "none";

            }

            taskList.appendChild(
                card
            );

        }
    );

    updateStats();

    updateTaskCounter();

    updateEmptyState();

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        "toast";

    toast.dataset.type =
        type;

    const icon =
        document.createElement(
            "span"
        );

    icon.className =
        "toast-icon";

    icon.textContent =
        type === "error" ||
        type === "limit"
            ? "!"
            : "✓";

    const text =
        document.createElement(
            "span"
        );

    text.className =
        "toast-message";

    text.textContent =
        message;

    toast.append(
        icon,
        text
    );

    toastContainer.appendChild(
        toast
    );

    setTimeout(
        () => {

            closeToast(
                toast
            );

        },
        3200
    );

}


function closeToast(toast) {

    if (
        !toast ||
        !toast.isConnected ||
        toast.classList.contains(
            "is-leaving"
        )
    ) {

        return;

    }

    toast.classList.add(
        "is-leaving"
    );

    setTimeout(
        () => {

            toast.remove();

        },
        220
    );

}


/* =========================================================
   DESFAZER EXCLUSÃO INDIVIDUAL
   ========================================================= */

function showUndoDeleteToast(
    deletedTask
) {

    const toast =
        createUndoToast(
            "Tarefa removida.",
            "Desfazer exclusão da tarefa"
        );

    const button =
        toast.querySelector(
            ".toast-action"
        );

    const timer =
        setTimeout(
            () => {

                closeToast(
                    toast
                );

            },
            5000
        );

    button.addEventListener(
        "click",
        () => {

            clearTimeout(
                timer
            );

            restoreDeletedTask(
                deletedTask
            );

            closeToast(
                toast
            );

        }
    );

}


/* =========================================================
   DESFAZER APAGAR CONCLUÍDAS
   ========================================================= */

function showUndoClearCompletedToast(
    deletedTasks
) {

    const message =
        deletedTasks.length === 1
            ? "1 tarefa concluída removida."
            : `${deletedTasks.length} tarefas concluídas removidas.`;

    const toast =
        createUndoToast(
            message,
            "Desfazer exclusão das tarefas concluídas"
        );

    const button =
        toast.querySelector(
            ".toast-action"
        );

    const timer =
        setTimeout(
            () => {

                closeToast(
                    toast
                );

            },
            5000
        );

    button.addEventListener(
        "click",
        () => {

            clearTimeout(
                timer
            );

            restoreClearedCompletedTasks(
                deletedTasks
            );

            closeToast(
                toast
            );

        }
    );

}


/* =========================================================
   CRIAR TOAST COM DESFAZER
   ========================================================= */

function createUndoToast(
    message,
    ariaLabel
) {

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        "toast has-action";

    toast.dataset.type =
        "delete";

    const icon =
        document.createElement(
            "span"
        );

    icon.className =
        "toast-icon";

    icon.textContent =
        "×";

    const text =
        document.createElement(
            "span"
        );

    text.className =
        "toast-message";

    text.textContent =
        message;

    const undoButton =
        document.createElement(
            "button"
        );

    undoButton.type =
        "button";

    undoButton.className =
        "toast-action";

    undoButton.textContent =
        "Desfazer";

    undoButton.setAttribute(
        "aria-label",
        ariaLabel
    );

    toast.append(
        icon,
        text,
        undoButton
    );

    toastContainer.appendChild(
        toast
    );

    return toast;

}


/* =========================================================
   INPUT PRINCIPAL
   ========================================================= */

taskInput.addEventListener(
    "input",
    () => {

        if (
            taskInput.value.length >
            MAX_CHARACTERS
        ) {

            taskInput.value =
                taskInput.value.slice(
                    0,
                    MAX_CHARACTERS
                );

        }

        updateCharacterCounter();

    }
);


taskInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            addTask();

        }

    }
);


addTaskButton.addEventListener(
    "click",
    addTask
);


/* =========================================================
   EVENTOS DO MODAL
   ========================================================= */

cancelDeleteButton.addEventListener(
    "click",
    closeDeleteModal
);


confirmDeleteButton.addEventListener(
    "click",
    confirmDeleteAction
);


deleteModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            deleteModal
        ) {

            closeDeleteModal();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            deleteModal.classList.contains(
                "is-visible"
            )
        ) {

            closeDeleteModal();

        }

    }
);


/* =========================================================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================================================= */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key !== STORAGE_KEY &&
            event.key !== OLD_STORAGE_KEY
        ) {

            return;

        }

        tasks =
            loadTasks();

        normalizeOrders();

        renderTasks(
            false
        );

    }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initializeApp() {

    tasks =
        loadTasks();

    normalizeOrders();

    saveTasks();

    updateCharacterCounter();

    renderTasks(
        false
    );

}


initializeApp();