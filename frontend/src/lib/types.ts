/**
 * Shared domain types.
 *
 * Single source of truth for entities used across the frontend.
 * Import from here instead of re-declaring in pages/components/libs.
 */

export type Note = {
    id: number;
    title: string;
    content?: string;
    createdAt: string;
};
