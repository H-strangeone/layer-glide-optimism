import SingleTransaction from '@/components/SingleTransaction';

export default function Home() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-3xl font-bold text-primary">Welcome to Layer 2</h1>
            <p className="text-muted-foreground">
                Experience fast and secure transactions on Layer 2
            </p>
            <DepositCard />
            <SingleTransaction />
        </div>
    );
} 