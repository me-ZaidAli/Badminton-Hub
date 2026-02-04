import { useState } from "react";
import { Link } from "wouter";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, MapPin, Search, Plus, ArrowRight } from "lucide-react";

export default function Clubs() {
  const { data: user } = useUser();
  const { data: clubs, isLoading } = useClubs();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClubs = clubs?.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {!user && (
        <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">Dragon Badminton Club</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </header>
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <PageHeader 
          title="Browse Clubs" 
          description="Find a badminton club near you and join the community."
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clubs"
            />
          </div>
          {user && (
            <Link href="/create-club">
              <Button data-testid="button-create-club">
                <Plus className="w-4 h-4 mr-2" />
                Create Club
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No clubs found matching your search." : "No clubs available yet."}
              </p>
              {user && (
                <Link href="/create-club">
                  <Button className="mt-4">Create the First Club</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => (
              <Card key={club.id} className="hover-elevate transition-all" data-testid={`club-card-${club.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{club.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {club.slug}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {club.description || "A great place to play badminton and meet fellow players."}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Open for members</span>
                    </div>
                    {user ? (
                      <Link href={`/clubs/${club.id}/join`}>
                        <Button size="sm" variant="outline" data-testid={`button-join-club-${club.id}`}>
                          Join
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/register">
                        <Button size="sm" variant="outline">
                          Register to Join
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
