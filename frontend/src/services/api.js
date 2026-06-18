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

// Progress endpoints
export function fetchProgress() { return request('/api/progress'); }
export function fetchStudentProgress(id) { return request(`/api/progress/student/${id}`); }
export function fetchCurrentLevel() { return request('/api/progress/current-level'); }
export function completeLevel(level, userId) {
    return request(`/api/progress/${level}/completed`, {
        method: 'PUT',
        body: JSON.stringify({ user: userId }),
    });
}
export function addBookToLevel(level, bookId) {
    return request(`/api/progress/${level}/add-book`, {
        method: 'PUT',
        body: JSON.stringify({ book: bookId }),
    });
}

// Book endpoints
export function fetchBooks() { return request('/api/books'); }
export function fetchBook(id) { return request(`/api/books/${id}`); }
export function createBook(body) {
    return request('/api/books', {
        method: 'POST',
        body: body,
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
export function fetchMyStudents() { return request('/api/users/my-students'); }
export function createStudent(body) {
    return request('/api/users/students', {
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

export { ApiError };
