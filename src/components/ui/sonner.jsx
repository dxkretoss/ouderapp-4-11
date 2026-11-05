import { Toaster as Sonner } from "sonner";
const Toaster = ({ ...props }) => {
    return (<Sonner className="toaster group" duration={3000} visibleToasts={1} toastOptions={{
            classNames: {
                toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-none group-[.toaster]:rounded-xl group-[.toaster]:bg-card",
                icon: "group-[.toast]:text-brand",
                title: "font-semibold",
                description: "group-[.toast]:text-muted-foreground",
                actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            },
        }} {...props}/>);
};
export { Toaster };
