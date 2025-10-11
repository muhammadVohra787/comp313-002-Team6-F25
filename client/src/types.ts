export type NavItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
};

export type SetAttentionItem = (id: string, attention: boolean) => void;