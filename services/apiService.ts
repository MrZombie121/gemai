
import { User, Chat as AppChat } from '../types.ts';

// This is a mock API service that simulates a backend connection.
// In a real application, these functions would make HTTP requests (e.g., using fetch)
// to a backend server, which would then interact with a database.
// For now, it uses localStorage and setTimeout to mimic asynchronous behavior.

const API_LATENCY = 200; // ms

// --- User Data ---

const _getUsers = (): (User & { passwordHash: string })[] => {
    try {
        const raw = localStorage.getItem("gemai_users");
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const _saveUsers = (users: (User & { passwordHash: string })[]) => {
    localStorage.setItem("gemai_users", JSON.stringify(users));
};

export const fetchUserByUsername = async (username: string): Promise<(User & { passwordHash: string }) | undefined> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const users = _getUsers();
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            resolve(user);
        }, API_LATENCY);
    });
};

export const saveNewUser = async (user: User & { passwordHash: string }): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const users = _getUsers();
            if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
                return reject(new Error("Username already exists."));
            }
            _saveUsers([...users, user]);
            const { passwordHash, ...sessionUser } = user;
            resolve(sessionUser);
        }, API_LATENCY);
    });
};


export const updateUser = async (updatedUser: User): Promise<User> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let users = _getUsers();
            const idx = users.findIndex(u => u.username === updatedUser.username);
            if (idx > -1) {
                // Ensure passwordHash isn't overwritten by partial updates
                const passwordHash = users[idx].passwordHash;
                users[idx] = { ...users[idx], ...updatedUser, passwordHash };
                _saveUsers(users);
            }
            resolve(updatedUser);
        }, API_LATENCY);
    });
};


// --- Chat Data ---

const _getAllChats = (): { [k: string]: AppChat[] } => {
    try {
        const raw = localStorage.getItem("gemai_chats");
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const _saveAllChats = (allChats: { [k: string]: AppChat[] }) => {
    localStorage.setItem("gemai_chats", JSON.stringify(allChats));
};

export const fetchChatsForUser = async (username: string): Promise<AppChat[]> => {
     return new Promise(resolve => {
        setTimeout(() => {
            const allChats = _getAllChats();
            const userChats = Array.isArray(allChats[username]) ? allChats[username] : [];
            // Backwards compatibility for messages without IDs
            const chatsWithIds = userChats.map(chat => ({
                ...chat,
                messages: chat.messages.map((msg, index) => ({
                    ...msg,
                    id: msg.id || `msg_${chat.id}_${index}`
                }))
            }));
            resolve(chatsWithIds.filter(c => c && typeof c.id === "string")
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        }, API_LATENCY);
    });
};

export const saveChatsForUser = async (username: string, chats: AppChat[]): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const all = _getAllChats();
            all[username] = chats;
            _saveAllChats(all);
            resolve();
        }, API_LATENCY);
    });
};
