class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const getCsrfToken = () => {
    const match = document.cookie.match(new RegExp('(^| )X-CSRF-TOKEN=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : undefined
}

async function request(path, options = {}) {
    const csrfToken = options?.method ? getCsrfToken() : ''

    const headers = {
        'X-CSRF-TOKEN': csrfToken
    }

    if (!(options?.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(path, {
        credentials: 'same-origin',
        headers,
        ...options,
    });
    if (!res.ok) {
        const body = await res.json();
        const msg = body.error || body.message || res.statusText;
        throw new ApiError(res.status, msg);
    }
    return res.statusText === 'No Content' || res.status === 204 ? res : res.json();
}

// Auth endpoints
export async function fetchLogin(identifier, password, teacher_name) {
    // ∨∨ this fetch('/auth/csrf-token') is required only in the login route, because the logout route clears cookies
    // ∨∨ and no requests are made between logout and login, so the CSRF-token wont be set.
    await fetch('/auth/csrf-token')
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            identifier,
            password,
            teacher_name
        })
    })
}
// Book endpoints
export function fetchBooks() { return request('/api/books'); } // Unused
export function fetchMyBooks() { return request('/api/books/my-books'); }
export function fetchBookReaders(id) { return request(`/api/books/book-readers/${id}`); }
export function createBook(body) {
    return request('/api/books', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export function deleteBook(id) {
    return request(`/api/books/${id}`, {
        method: 'DELETE',
    });
}

// Progress endpoints
export function fetchProgress() { return request('/api/progress'); }
export function fetchStudentProgress(id) { return request(`/api/progress/student/${id}`); }
export function fetchCurrentLevel() { return request('/api/progress/current-level'); } // Unused
export function completeLevel(level, userId) {
    return request(`/api/progress/${level}/completed`, {
        method: 'PUT',
        body: JSON.stringify({ user: userId }),
    });
}
export function updateLevelProgress(level, currentProgress) {
    return request(`/api/progress/${level}/current-progress`, {
        method: 'PUT',
        body: JSON.stringify({ current_progress: currentProgress }),
    });
}
export function addBookToLevel(level, bookId) {
    return request(`/api/progress/${level}/add-book`, {
        method: 'PUT',
        body: JSON.stringify({ book: bookId }),
    });
}

// Submissions endpoints
export function fetchSubmissions() { return request(`/api/submissions`); }
export function fetchStudentSubmissions(id) { return request(`/api/submissions/student/${id}`); }
export function submitQuiz(data, progressId) {
    return request('/api/submissions/add-submission', {
        method: 'POST',
        body: JSON.stringify({ ...data, completedLevel: progressId }),
    });
}
export function reSubmitQuiz(data, progressId) {
    return request('/api/submissions', {
        method: 'PUT',
        body: JSON.stringify({ ...data, completedLevel: progressId }),
    });
}
export function updateSubmissionStatus(level, userId, status) {
    return request(`/api/progress/${level}/status`, {
        method: 'PUT',
        body: JSON.stringify({ user: userId, status }),
    });
}

// Rewards endpoints
export function fetchRewards() { return request('/api/rewards'); }
export function addReward(owner, type, name) {
    return request('/api/rewards/add-reward', {
        method: 'POST',
        body: JSON.stringify({ owner, type, name }),
    });
}

// Teacher / student management endpoints
export function updateTeacherName(id, name) {
    return request(`/api/users/profile/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}
export function deleteCurrentTeacher() {
    return request(`/api/users`, {
        method: 'DELETE',
    });
}
export function deleteAllMyStudents() {
    return request('/api/users/my-students', {
        method: 'DELETE',
    });
}
export function fetchMyStudents() { return request('/api/users/my-students'); }
export function createStudent(body) {
    return request('/api/users/students', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export function createStudentWithInvite(body) {
    return request('/api/users/invite/student', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export function updateUserName(id, name) {
    return request(`/api/users/profile/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}
export function updateUserEmail(id, email) {
    return request(`/api/users/profile/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ email }),
    });
}
export function updateUserAvatar(id, avatar) {
    return request(`/api/users/profile/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avatar }),
    });
}
export function resetStudentPassword(id, password) {
    return request(`/api/users/students/${id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
    });
}
export function deleteStudent(id) {
    return request(`/api/users/students/${id}`, {
        method: 'DELETE',
    });
}

// Transfer request endpoints
export function fetchTransferRequestsInbox() {
    return request('/api/transfer-requests/inbox');
}
export function fetchTransferRequestsOutbox() {
    return request('/api/transfer-requests/outbox');
}
export function sendTransferRequest(body) {
    return request(`/api/transfer-requests`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export function deleteTransferRequest(id) {
    return request(`/api/transfer-requests/${id}`, {
        method: 'DELETE',
    });
}
export function acceptTransferRequest(id) {
    return request(`/api/transfer-requests/${id}/accept`, {
        method: 'PATCH',
    });
}
export function rejectTransferRequest(id) {
    return request(`/api/transfer-requests/${id}/reject`, {
        method: 'PATCH',
    });
}

// Invite link endpoints
export function fetchInviteLink() { return request('/api/invite'); }
export function regenerateInviteLink() {
    return request(`/api/invite/regenerate`, {
        method: 'POST',
    });
}
export function toggleInviteLink() {
    return request(`/api/invite/toggle`, {
        method: 'PATCH',
    });
}

export { ApiError };
